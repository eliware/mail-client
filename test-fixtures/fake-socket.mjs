export class FakeSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.sent = [];
    FakeSocket.instances.push(this);
  }

  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }

  send(value) {
    this.sent.push(value);
  }

  close(code, reason) {
    this.closed = { code, reason };
    this.emit("close", { code });
  }

  emit(name, value) {
    this.listeners.get(name)?.(value);
  }
}
