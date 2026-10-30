export function socketUrl(baseUrl, cursor, consumerId) {
  const url = new URL("/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (cursor !== null) url.searchParams.set("after", cursor);
  if (consumerId !== undefined) url.searchParams.set("consumer_id", consumerId);
  return url.toString();
}
