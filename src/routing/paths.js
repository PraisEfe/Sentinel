export const pagePaths = {
  dashboard: "/",
  search: "/search",
  monitors: "/monitors",
  intelligence: "/intelligence",
  analytics: "/analytics",
  alerts: "/alerts",
  settings: "/settings",
};
export function workspacePathFor(page) {
  return pagePaths[page] || "/";
}
export function safeReturnTo(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^\/(signin|signup|forgot-password)(\/|\?|$)/.test(value)
    ? value
    : "/";
}
