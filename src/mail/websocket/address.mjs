export function socketUrl(baseUrl, cursor) {
  const url = new URL("/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (cursor !== null) url.searchParams.set("after", cursor);
  return url.toString();
}
