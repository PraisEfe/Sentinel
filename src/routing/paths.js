export const pagePaths = {
  dashboard: "/",
  search: "/search",
  monitors: "/monitors",
  intelligence: "/intelligence",
  analytics: "/analytics",
  alerts: "/alerts",
  settings: "/settings",
};
export const isDemoPath = (pathname) =>
  pathname === "/demo" || pathname.startsWith("/demo/");
export function workspacePathFor(page, demo = false) {
  const path = pagePaths[page] || "/";
  return demo ? (path === "/" ? "/demo" : `/demo${path}`) : path;
}
export function safeReturnTo(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^\/(signin|signup|forgot-password)(\/|\?|$)/.test(value)
    ? value
    : "/";
}
