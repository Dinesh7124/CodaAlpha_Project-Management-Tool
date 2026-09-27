export function notFound(req, res) {
  res.status(404).json({ error: "Route " + req.originalUrl + " not found" });
}

export function errorHandler(err, _req, res, _next) {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}
