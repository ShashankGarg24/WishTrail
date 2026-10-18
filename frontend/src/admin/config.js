const normalizePath = (value) => {
  const raw = String(value || "/admin").trim();
  return (
    `/${raw.replace(/^\/+|\/+$/g, "")}`
      .replace(/\/+/g, "/")
      .replace(/\/+$/g, "") || "/admin"
  );
};
export const ADMIN_BASE = normalizePath(import.meta.env.VITE_ADMIN_UI_ROUTE);
export const adminPath = (section = "") =>
  `${ADMIN_BASE}${section ? `/${section}` : ""}`;
