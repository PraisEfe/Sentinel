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
let authorizationController = null;
let authorizationGeneration = 0;
const initialSession = readSession();
function cancelAuthorization() {
  authorizationGeneration += 1;
  authorizationController?.abort();
  authorizationController = null;
}
function cancelJobs() {
  sessionJob?.controller.abort();
  workspaceJob?.controller.abort();
  sessionJob = null;
  workspaceJob = null;
  cancelAuthorization();
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
      user: initialSession?.user || null,
      boot: { loading: !!initialSession, error: "" },
      authVersion: 0,
      authorizationVersion: 0,
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
          authorizationVersion: state.authorizationVersion + 1,
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
          authorizationVersion: state.authorizationVersion + 1,
          notice: "",
          boot: { loading: true, error: "" },
        }));
        await get().initializeSession();
      },
      clearSessionAfterPasswordReset: () => {
        void stopLocalPush(get().user?.id).catch(() => {});
        cancelJobs();
        clearSession();
        set((state) => ({
          ...privateReset(),
          authVersion: state.authVersion + 1,
          authorizationVersion: state.authorizationVersion + 1,
          notice: "",
        }));
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
            const authorization = await get().refreshAuthorization("", {
              signal: controller.signal,
              authVersion,
            });
            if (
              authorization &&
              get().authVersion === authVersion &&
              !controller.signal.aborted
            )
              set({ boot: { loading: false, error: "" } });
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
        set((state) => ({
          ...privateReset(),
          authVersion: state.authVersion + 1,
          authorizationVersion: state.authorizationVersion + 1,
          notice: "",
        }));
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
        const { session, user, workspaceId } = get();
        if (!session) throw new ApiError("Please sign in to continue.", 401);
        if (user?.is_email_verified !== true)
          throw new ApiError(
            "Verify your email address before opening workspace data.",
            403,
            {},
            "email_verification_required",
          );
        if (user?.is_roster_active === false)
          throw new ApiError(
            "Your linked personnel record is inactive. Contact your Unit administrator.",
            403,
            {},
            "account_roster_inactive",
          );
        if (!path.startsWith("/auth/") && !workspaceId)
          throw new ApiError("Select a workspace to continue.");
        return request(
          path.startsWith("/auth/") ? path : workspacePath(workspaceId, path),
          { ...options, token: session.token },
        );
      },
      authenticatedApi: (path, options = {}) => {
        const { session, user } = get();
        if (!session) throw new ApiError("Please sign in to continue.", 401);
        if (typeof path !== "string" || !path.startsWith("/"))
          throw new ApiError("The requested API path is invalid.");
        if (
          user?.is_email_verified !== true &&
          !path.startsWith("/auth/") &&
          !path.startsWith("/invitations/") &&
          path !== "/units"
        )
          throw new ApiError(
            "Verify your email address before opening workspace data.",
            403,
            {},
            "email_verification_required",
          );
        return request(path, { ...options, token: session.token });
      },
      refreshAuthorization: async (
        preferredWorkspaceId = "",
        { signal, authVersion: expectedVersion } = {},
      ) => {
        const state = get();
        const sessionVersion = expectedVersion ?? state.authVersion;
        if (!state.session)
          throw new ApiError("Please sign in to continue.", 401);
        if (sessionVersion !== state.authVersion) return null;

        authorizationController?.abort();
        const controller = new AbortController();
        const generation = ++authorizationGeneration;
        authorizationController = controller;
        const requestSignal = signal
          ? AbortSignal.any([signal, controller.signal])
          : controller.signal;
        const isCurrent = () =>
          authorizationGeneration === generation &&
          authorizationController === controller &&
          get().authVersion === sessionVersion &&
          !requestSignal.aborted;
        const token = state.session.token;
        try {
          const account = await request("/auth/me", {
            token,
            signal: requestSignal,
          });
          if (!isCurrent()) return null;
          const accountUser = account?.user ?? account?.data ?? account;
          if (!accountUser?.id)
            throw new ApiError(
              "The server returned an unexpected account response. Please try again.",
            );

          const existingUser = get().user;
          const user =
            existingUser?.id === accountUser.id
              ? { ...existingUser, ...accountUser }
              : { ...accountUser };
          let workspaces = [];
          if (
            user.is_email_verified === true &&
            user.is_approved &&
            user.is_roster_active !== false
          ) {
            const list = await requestList("/workspaces", {
              token,
              signal: requestSignal,
            });
            if (!isCurrent()) return null;
            workspaces = list.data;
          }

          if (!isCurrent()) return null;
          const current = get();
          const authorized = (id) =>
            Boolean(id) && workspaces.some((workspace) => workspace.id === id);
          const saved = current.workspaceSelections[user.id];
          const workspaceId = authorized(preferredWorkspaceId)
            ? preferredWorkspaceId
            : authorized(current.workspaceId)
              ? current.workspaceId
              : authorized(saved)
                ? saved
                : workspaces[0]?.id || "";

          workspaceJob?.controller.abort();
          workspaceJob = null;
          set((latest) => ({
            user,
            workspaces,
            workspaceId,
            boot: { loading: false, error: "" },
            authorizationVersion: latest.authorizationVersion + 1,
            data: emptyData(),
            dataStatus: { loading: false, error: "" },
            dataKey: "",
            monitorPage: 1,
            selection: null,
            createOpen: false,
            monitorSeed: "",
            sidebarOpen: false,
            workspaceSelections: {
              ...latest.workspaceSelections,
              [user.id]: workspaceId,
            },
          }));
          return { user, workspaces, workspaceId };
        } catch (failure) {
          if (
            failure.name === "AbortError" &&
            controller.signal.aborted &&
            !signal?.aborted
          )
            return null;
          if (
            failure.name !== "AbortError" &&
            isCurrent() &&
            get().boot.loading &&
            failure.status !== 401
          )
            set({ boot: { loading: false, error: failure.message } });
          throw failure;
        } finally {
          if (authorizationController === controller)
            authorizationController = null;
        }
      },
      loadWorkspace: async ({
        page = get().monitorPage,
        force = false,
      } = {}) => {
        const {
          session,
          workspaceId,
          authVersion,
          authorizationVersion,
          boot,
        } = get();
        if (
          !session ||
          !workspaceId ||
          boot.loading ||
          boot.error ||
          get().user?.is_roster_active === false ||
          get().user?.is_email_verified !== true
        )
          return;
        const key = `${authVersion}:${authorizationVersion}:${workspaceId}:${page}`;
        if (workspaceJob?.key === key && !force) return workspaceJob.promise;
        if (!force && get().dataKey === key) return;
        workspaceJob?.controller.abort();
        const controller = new AbortController();
        const job = { key, controller, promise: null };
        workspaceJob = job;
        set({ monitorPage: page, dataStatus: { loading: true, error: "" } });
        const valid = () =>
          get().authVersion === authVersion &&
          get().authorizationVersion === authorizationVersion &&
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
          if (
            results.every(
              (result) =>
                result.status === "rejected" &&
                [403, 404].includes(result.reason?.status),
            )
          ) {
            await get().refreshAuthorization();
            return;
          }
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
      createWorkspace: async (fields) => {
        if (!get().session) throw new ApiError("Please sign in to continue.", 401);
        if (get().user?.is_email_verified !== true)
          throw new ApiError(
            "Verify your email address before opening workspace data.",
            403,
            {},
            "email_verification_required",
          );
        if (get().user?.is_roster_active === false)
          throw new ApiError(
            "Your linked personnel record is inactive. Contact your Unit administrator.",
            403,
            {},
            "account_roster_inactive",
          );
        const name = fields?.name?.trim() || "";
        if (!name || name.length > 120)
          throw new ApiError("Enter an office workspace name of up to 120 characters.");
        if (!fields?.parent_id && !fields?.unit_id)
          throw new ApiError("Choose a Unit or parent office.");
        if (!["office", "directorate", "oversight"].includes(fields?.level))
          throw new ApiError("Choose a valid office type.");
        const authVersion = get().authVersion;
        const result = await request("/workspaces", {
          token: get().session?.token,
          method: "POST",
          body: {
            name,
            level: fields.level,
            ...(fields.parent_id
              ? { parent_id: fields.parent_id }
              : { unit_id: fields.unit_id }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });
        if (!result.data?.id)
          throw new ApiError("The server did not return the new workspace.");
        if (get().authVersion !== authVersion) return;
        const created = result.data;
        workspaceJob?.controller.abort();
        workspaceJob = null;
        set((state) => ({
          workspaces: [
            ...state.workspaces.filter((item) => item.id !== created.id),
            created,
          ],
          workspaceId: created.id,
          dataKey: "",
          data: emptyData(),
          dataStatus: { loading: false, error: "" },
          monitorPage: 1,
          selection: null,
          createOpen: false,
          monitorSeed: "",
          sidebarOpen: false,
          notice: "",
          workspaceSelections: {
            ...state.workspaceSelections,
            [state.user.id]: created.id,
          },
        }));
        try {
          await get().refreshAuthorization(created.id, { authVersion });
        } catch (failure) {
          if (failure.status === 401) throw failure;
          if (get().authVersion !== authVersion) return;
          set({
            notice:
              "Workspace created. Some access details could not be refreshed; refresh the page before managing it.",
          });
          return created;
        }
        if (get().authVersion !== authVersion) return;
        return created;
      },
      createMonitor: async (fields) => {
        const result = await get().api("/monitors", {
          method: "POST",
          body: fields,
        });
        void get().refreshWorkspace();
        return result.data;
      },
      deleteMonitor: async (monitorId) => {
        const { workspaceId, authVersion } = get();
        await get().api(`/monitors/${encodeURIComponent(monitorId)}`, { method: "DELETE" });
        if (get().workspaceId !== workspaceId || get().authVersion !== authVersion) return null;
        workspaceJob?.controller.abort();
        workspaceJob = null;
        const { data, monitorPage } = get();
        const page = data.monitors.length === 1 && monitorPage > 1 ? monitorPage - 1 : monitorPage;
        set({ dataKey: "", data: { ...data, monitors: data.monitors.filter((item) => item.id !== monitorId), monitorTotal: Math.max(0, data.monitorTotal - 1) } });
        await get().loadWorkspace({ page, force: true });
        return get().workspaceId === workspaceId && get().authVersion === authVersion ? page : null;
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
      updateUser: (user) =>
        set((state) => ({ user: { ...state.user, ...user } })),
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
