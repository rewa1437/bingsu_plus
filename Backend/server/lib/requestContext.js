/**
 * Extract request context (IP, etc.) for logging and rate limiting.
 */
export function getRequestContext(req) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress;
  return { ip };
}
