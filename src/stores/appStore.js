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
import { createDemoService } from "../data/demoWorkspace";

export const defaultPreferences = Object.freeze({
  groupStories: true,
  includeSocial: true,
  aiSummaries: true,
  detectTone: true,
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
      demoService: null,
      demoUser: null,
      demoData: emptyData(),
      setNotice: (notice) => set({ notice }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      openResult: (selection) => set({ selection }),
      closeResult: () => set({ selection: null }),
      openMonitor: (monitorSeed = "") =>
        set({ monitorSeed, createOpen: true, selection: null }),
      closeMonitor: () => set({ createOpen: false }),

      expire: () => {
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
        const { session, authVersion } = get();
        let notice = "";
        try {
          if (session)
            await request("/auth/logout", {
              token: session.token,
              method: "POST",
            });
        } catch (error) {
          if (error.status !== 401)
            notice =
              "Signed out on this device. The server could not be reached to revoke this session.";
        }
        // An expired request must not clear a newer sign-in.
        if (get().authVersion !== authVersion && get().session) return;
        cancelJobs();
        clearSession();
        set((state) => ({
          ...privateReset(),
          notice,
          authVersion: state.authVersion + 1,
        }));
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
        if (!name.trim()) throw new ApiError("Enter a workspace name.");
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
        set((state) => ({
          workspaces: [...state.workspaces, result.data],
          workspaceId: result.data.id,
          dataKey: "",
          data: emptyData(),
          workspaceSelections: {
            ...state.workspaceSelections,
            [state.user.id]: result.data.id,
          },
        }));
      },
      createMonitor: async (fields, demo = false) => {
        if (demo) {
          const service = get().demoService;
          const monitor = {
            ...fields,
            id: crypto.randomUUID(),
            is_active: true,
            mention_count: 0,
            latest_scan: null,
          };
          service.store.monitors = [...service.store.monitors, monitor];
          get().refreshDemo();
          return monitor;
        }
        const result = await get().api("/monitors", {
          method: "POST",
          body: fields,
        });
        void get().refreshWorkspace();
        return result.data;
      },
      clearHistory: async (demo = false) => {
        if (demo) {
          set((state) => ({ demoData: { ...state.demoData, history: [] } }));
          return;
        }
        const { workspaceId, authVersion } = get();
        await get().api("/history/searches", { method: "DELETE" });
        if (
          get().workspaceId === workspaceId &&
          get().authVersion === authVersion
        )
          set((state) => ({ data: { ...state.data, history: [] } }));
      },
      updateUser: (user, demo = false) =>
        demo ? set({ demoUser: { ...user } }) : set({ user: { ...user } }),
      savePreferences: (next, demo = false) => {
        const state = get();
        const key = demo ? "demo" : `${state.user?.id}:${state.workspaceId}`;
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
      startDemo: () => {
        if (get().demoService) return;
        const service = createDemoService();
        const now = Date.now();
        set({
          demoService: service,
          demoUser: { ...service.store.account },
          demoData: {
            ...emptyData(),
            monitors: [...service.store.monitors],
            monitorTotal: service.store.monitors.length,
            unread: service.store.alerts.filter((item) => !item.read_at).length,
            sourcesCount: service.store.sources.length,
            history: [
              ["MTN Nigeria", 4821],
              ["Dangote", 1201],
              ["Nigerian banking sector", 1082],
              ["Cybersecurity", 2403],
            ].map(([query, result_count], index) => ({
              id: `demo-search-${index}`,
              query,
              result_count,
              created_at: new Date(now - (index + 1) * 3600000).toISOString(),
            })),
          },
        });
      },
      demoApi: async (path, options) => {
        get().startDemo();
        return structuredClone(await get().demoService.call(path, options));
      },
      refreshDemo: () => {
        const service = get().demoService;
        if (service)
          set((state) => ({
            demoData: {
              ...state.demoData,
              monitors: structuredClone(service.store.monitors),
              monitorTotal: service.store.monitors.length,
              unread: service.store.alerts.filter((item) => !item.read_at)
                .length,
            },
          }));
      },
      leaveDemo: () =>
        set({
          demoService: null,
          demoUser: null,
          demoData: emptyData(),
          sidebarOpen: false,
          selection: null,
          createOpen: false,
        }),
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
