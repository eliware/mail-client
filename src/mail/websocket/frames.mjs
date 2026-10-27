export function eventData(value) {
  const data = value?.data ?? value;
  if (typeof data === "string") return data;
  if (ArrayBuffer.isView(data)) return new TextDecoder().decode(data);
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  throw new TypeError("WebSocket frame must contain JSON text");
}
