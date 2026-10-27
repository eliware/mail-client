export function subscribe(socket, name, handler) {
  if (typeof socket.addEventListener === "function") {
    socket.addEventListener(name, handler);
    return () => socket.removeEventListener?.(name, handler);
  }
  if (typeof socket.on === "function") {
    socket.on(name, handler);
    return () => socket.off?.(name, handler);
  }
  throw new TypeError("WebSocket must support event listeners");
}
