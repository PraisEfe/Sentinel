import { useState } from "react";
import { WorkspaceContext } from "../../lib/workspace";
const defaults = {
  groupStories: true,
  includeSocial: true,
  aiSummaries: true,
  detectTone: true,
};
export default function WorkspaceProvider({
  children,
  workspaceId,
  api,
  demo,
  user,
  onUserUpdate,
  onRefresh,
}) {
  const key = `sentinel_discovery_${workspaceId}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") };
    } catch {
      return defaults;
    }
  });
  function savePreferences(next) {
    localStorage.setItem(key, JSON.stringify(next));
    setPreferences(next);
  }
  return (
    <WorkspaceContext.Provider
      value={{
        api,
        demo,
        user,
        onUserUpdate,
        onRefresh,
        preferences,
        savePreferences,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
