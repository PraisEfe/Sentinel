import { stopLocalPush } from "../lib/push";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ApiError,
  clearSession,
  onUnauthorized,
  readSession,
  request,
  requestList,
  saveSession,
  workspacePath,
} from "../lib/api";

export const defaultPreferences = Object.freeze({
  groupStories: true,
  includeSocial: true,
  aiSummaries: true,
  detectTone: true,
  showHistory: true,
  compactResults: false,
});
const emptyData = () => ({
  monitors: [],
  history: [],
  sourcesCount: undefined,
  unread: 0,
  monitorTotal: 0,
  lastPage: 1,
});
let sessionJob = null;
let workspaceJob = null;
const initialSession = readSession();
function cancelJobs() {
  sessionJob?.controller.abort();
  workspaceJob?.controller.abort();
  sessionJob = null;
  workspaceJob = null;
}
const privateReset = () => ({
  session: null,
  user: null,
  workspaces: [],
  workspaceId: "",
  boot: { loading: false, error: "" },
  data: emptyData(),
  dataStatus: { loading: false, error: "" },
  dataKey: "",
  monitorPage: 1,
  sidebarOpen: false,
  selection: null,
  createOpen: false,
  monitorSeed: "",
});

export const useAppStore = create(
  persist(
    (set, get) => ({
      ...privateReset(),
      session: initialSession,
      boot: { loading: !!initialSession, error: "" },
      authVersion: 0,
      notice: "",
      preferences: {},
      workspaceSelections: {},
      setNotice: (notice) => set({ notice }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      openResult: (selection) => set({ selection }),
      closeResult: () => set({ selection: null }),
      openMonitor: (monitorSeed = "") =>
        set({ monitorSeed, createOpen: true, selection: null }),
      closeMonitor: () => set({ createOpen: false }),

      expire: () => {
        void stopLocalPush(get().user?.id).catch(() => {});
        cancelJobs();
        clearSession();
        set((state) => ({
          ...privateReset(),
          authVersion: state.authVersion + 1,
          notice: "Your session has expired. Please sign in again.",
        }));
      },
      acceptSession: async (session, remember) => {
        cancelJobs();
        saveSession(session, remember);
        set((state) => ({
          ...privateReset(),
          session,
          user: session.user,
          authVersion: state.authVersion + 1,
          notice: "",
          boot: { loading: true, error: "" },
        }));
        await get().initializeSession();
      },
      initializeSession: async () => {
        const { session, authVersion } = get();
        if (!session) return;
        if (sessionJob?.token === session.token) return sessionJob.promise;
        sessionJob?.controller.abort();
        const controller = new AbortController();
        const job = { token: session.token, controller, promise: null };
        sessionJob = job;
        set({ boot: { loading: true, error: "" } });
        job.promise = (async () => {
          try {
            const [account, list] = await Promise.all([
              request("/auth/me", {
                token: session.token,
                signal: controller.signal,
              }),
              requestList("/workspaces", {
                token: session.token,
                signal: controller.signal,
              }),
            ]);
            if (get().authVersion !== authVersion || controller.signal.aborted)
              return;
            if (!account.user?.id)
              throw new ApiError(
                "The server returned an unexpected account response. Please try again.",
              );
            const saved = get().workspaceSelections[account.user.id];
            const workspaceId = list.data.some(
              (workspace) => workspace.id === saved,
            )
              ? saved
              : list.data[0]?.id || "";
            set({
              user: account.user,
              workspaces: list.data,
              workspaceId,
              boot: { loading: false, error: "" },
            });
          } catch (error) {
            if (
              get().authVersion === authVersion &&
              !controller.signal.aborted &&
              error.status !== 401
            )
              set({ boot: { loading: false, error: error.message } });
          } finally {
            if (sessionJob === job) sessionJob = null;
          }
        })();
        return job.promise;
      },
      logout: async () => {
        const { session, user } = get();
        // Close private routes immediately, including while a push registration
        // or server revocation is still in flight.
        cancelJobs();
        clearSession();
        set((state) => ({ ...privateReset(), authVersion: state.authVersion + 1, notice: "" }));
        const signedOutVersion = get().authVersion;
        let notice = "";
        try { await stopLocalPush(user?.id); }
        catch { notice = "Signed out. Review notification permission in your browser’s site settings."; }
        try {
          if (session) await request("/auth/logout", { token: session.token, method: "POST" });
        } catch (error) {
          if (error.status !== 401) notice = "Signed out on this device. The server could not be reached to revoke this session.";
        }
        if (get().authVersion === signedOutVersion && !get().session) set({ notice });
      },
      selectWorkspace: (workspaceId) => {
        const state = get();
        if (!state.workspaces.some((item) => item.id === workspaceId))
          throw new ApiError("You do not have access to that workspace.", 403);
        workspaceJob?.controller.abort();
        workspaceJob = null;
        set({
          workspaceId,
          data: emptyData(),
          dataKey: "",
          dataStatus: { loading: false, error: "" },
          monitorPage: 1,
          selection: null,
          createOpen: false,
          sidebarOpen: false,
          workspaceSelections: {
            ...state.workspaceSelections,
            [state.user.id]: workspaceId,
          },
        });
      },
      api: (path, options = {}) => {
        const { session, workspaceId } = get();
        if (!session) throw new ApiError("Please sign in to continue.", 401);
        if (!path.startsWith("/auth/") && !workspaceId)
          throw new ApiError("Select a workspace to continue.");
        return request(
          path.startsWith("/auth/") ? path : workspacePath(workspaceId, path),
          { ...options, token: session.token },
        );
      },
      loadWorkspace: async ({
        page = get().monitorPage,
        force = false,
      } = {}) => {
        const { session, workspaceId, authVersion, boot } = get();
        if (!session || !workspaceId || boot.loading || boot.error) return;
        const key = `${authVersion}:${workspaceId}:${page}`;
        if (workspaceJob?.key === key && !force) return workspaceJob.promise;
        if (!force && get().dataKey === key) return;
        workspaceJob?.controller.abort();
        const controller = new AbortController();
        const job = { key, controller, promise: null };
        workspaceJob = job;
        set({ monitorPage: page, dataStatus: { loading: true, error: "" } });
        const valid = () =>
          get().authVersion === authVersion &&
          get().workspaceId === workspaceId &&
          !controller.signal.aborted;
        job.promise = (async () => {
          const options = { token: session.token, signal: controller.signal };
          const paths = [
            `/monitors?page=${page}`,
            "/history/searches",
            "/sources",
            "/alerts/counts",
          ];
          const results = await Promise.allSettled(
            paths.map((path, index) =>
              (index < 3 ? requestList : request)(
                workspacePath(workspaceId, path),
                options,
              ),
            ),
          );
          if (!valid()) return;
          const value = (index) =>
            results[index].status === "fulfilled"
              ? results[index].value
              : undefined;
          const monitors = value(0)?.data || [];
          const stats = await Promise.allSettled(
            monitors.map((monitor) =>
              request(
                workspacePath(
                  workspaceId,
                  `/monitors/${encodeURIComponent(monitor.id)}/stats`,
                ),
                options,
              ),
            ),
          );
          if (!valid()) return;
          const failed =
            results.some((item) => item.status === "rejected") ||
            stats.some((item) => item.status === "rejected");
          set({
            data: {
              monitors: monitors.map((monitor, index) => ({
                ...monitor,
                ...(stats[index].status === "fulfilled"
                  ? stats[index].value.data
                  : {}),
              })),
              history: value(1)?.data || [],
              sourcesCount: value(2)?.data?.filter((source) => source.available)
                .length,
              unread: value(3)?.unread || 0,
              monitorTotal: value(0)?.meta?.total ?? monitors.length,
              lastPage: value(0)?.meta?.last_page || 1,
            },
            dataKey: failed ? "" : key,
            dataStatus: {
              loading: false,
              error: failed
                ? "Some workspace data could not be loaded. Please try again."
                : "",
            },
          });
        })()
          .catch(() => {
            if (valid())
              set({
                dataKey: "",
                dataStatus: {
                  loading: false,
                  error:
                    "Some workspace data could not be loaded. Please try again.",
                },
              });
          })
          .finally(() => {
            if (workspaceJob === job) workspaceJob = null;
          });
        return job.promise;
      },
      refreshWorkspace: () => get().loadWorkspace({ force: true }),
      createWorkspace: async (name) => {
        if (!get().session) throw new ApiError("Please sign in to continue.", 401);
        if (!name.trim() || name.trim().length > 120) throw new ApiError("Enter a workspace name of up to 120 characters.");
        const authVersion = get().authVersion;
        const result = await request("/workspaces", {
          token: get().session?.token,
          method: "POST",
          body: {
            name: name.trim(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (!result.data?.id)
          throw new ApiError("The server did not return the new workspace.");
        if (get().authVersion !== authVersion) return;
        workspaceJob?.controller.abort();
        workspaceJob = null;
        set((state) => ({
          workspaces: [...state.workspaces.filter((item) => item.id !== result.data.id), result.data],
          workspaceId: result.data.id,
          dataKey: "",
          data: emptyData(),
          dataStatus: { loading: false, error: "" },
          monitorPage: 1,
          selection: null,
          createOpen: false,
          monitorSeed: "",
          sidebarOpen: false,
          workspaceSelections: {
            ...state.workspaceSelections,
            [state.user.id]: result.data.id,
          },
        }));
        return result.data;
      },
      createMonitor: async (fields) => {
        const result = await get().api("/monitors", {
          method: "POST",
          body: fields,
        });
        void get().refreshWorkspace();
        return result.data;
      },
      clearHistory: async () => {
        const { workspaceId, authVersion } = get();
        await get().api("/history/searches", { method: "DELETE" });
        if (
          get().workspaceId === workspaceId &&
          get().authVersion === authVersion
        )
          set((state) => ({ data: { ...state.data, history: [] } }));
      },
      updateUser: (user) => set({ user: { ...user } }),
      savePreferences: (next) => {
        const state = get();
        const key = `${state.user?.id}:${state.workspaceId}`;
        // Persist only non-secret preferences and workspace selections.
        const preferences = {
          ...state.preferences,
          [key]: { ...defaultPreferences, ...next },
        };
        // Surface storage failures before claiming a successful save.
        const persisted = JSON.parse(
          localStorage.getItem("sentinel_preferences") || '{"state":{}}',
        );
        localStorage.setItem(
          "sentinel_preferences",
          JSON.stringify({
            ...persisted,
            state: {
              ...persisted.state,
              preferences,
              workspaceSelections: state.workspaceSelections,
            },
          }),
        );
        set({ preferences });
      },
    }),
    {
      name: "sentinel_preferences",
      partialize: (state) => ({
        preferences: state.preferences,
        workspaceSelections: state.workspaceSelections,
      }),
      merge: (saved, current) => ({
        ...current,
        preferences:
          saved?.preferences && typeof saved.preferences === "object"
            ? saved.preferences
            : {},
        workspaceSelections:
          saved?.workspaceSelections &&
          typeof saved.workspaceSelections === "object"
            ? saved.workspaceSelections
            : {},
      }),
    },
  ),
);

onUnauthorized((token) => {
  if (useAppStore.getState().session?.token === token)
    useAppStore.getState().expire();
});
