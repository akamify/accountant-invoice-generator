import handler from "./[...path].js";

export default async function apiIndex(req, res) {
  const rawPath = req.query?.path || "";
  const path = Array.isArray(rawPath) ? rawPath.join("/") : String(rawPath);

  req.query = {
    ...(req.query || {}),
    path: path.split("/").filter(Boolean).map(decodeURIComponent),
  };

  return handler(req, res);
}
