export function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("baseUrl must be a valid URL");
  }
  if (!/^https?:$/.test(url.protocol)) throw new TypeError("baseUrl must use HTTP or HTTPS");
  if (url.pathname !== "/" || url.username || url.password || url.search || url.hash) {
    throw new TypeError("baseUrl must be an HTTP origin without credentials or extra components");
  }
  return url.origin;
}
