const noop = () => {};
const silentLogger = { debug: noop, warn: noop, error: noop };

function errorName(error) {
  return typeof error?.name === "string" ? error.name : "Error";
}

export function createEventConnectionLogger(logger = silentLogger) {
  function write(level, message, metadata) {
    try {
      logger[level](message, metadata);
    } catch {}
  }

  return {
    started(cursor) {
      write("debug", "Mail event connection started", { cursor });
    },
    tokenProviderFailed(error) {
      write("error", "Mail event token provider failed", { errorName: errorName(error) });
    },
    invalidToken() {
      write("error", "Mail event token provider returned an invalid token", {
        errorName: "TypeError",
      });
    },
    reconnectScheduled(closeCode, delay, attempt, cursor) {
      write("warn", "Mail event connection reconnect scheduled", {
        closeCode,
        delayMs: delay,
        attempt,
        cursor,
      });
    },
    eventSkipped(cursor) {
      write("debug", "Mail event skipped because its cursor was already handled", { cursor });
    },
    eventStarted(eventType, cursor) {
      write("debug", "Mail event handling started", { eventType, cursor });
    },
    eventCompleted(eventType, cursor, acknowledged) {
      write("debug", "Mail event handling completed", { eventType, cursor, acknowledged });
    },
    authenticated(cursor) {
      write("debug", "Mail event connection authenticated", { cursor });
    },
    eventFailed(event, error) {
      write("error", "Mail event handling failed", {
        eventType: event?.event_type,
        cursor: event?.cursor ?? event?.event_id,
        errorName: errorName(error),
      });
    },
    closed(closeCode, authenticated, cursor) {
      write(authenticated ? "debug" : "warn", "Mail event connection closed", {
        closeCode,
        authenticated,
        cursor,
      });
    },
    socketFailed(error) {
      write("error", "Mail event socket failed", { errorName: errorName(error) });
    },
    startFailed(error) {
      write("error", "Mail event connection failed to start", { errorName: errorName(error) });
    },
    clientClosed(cursor) {
      write("debug", "Mail event connection closed by client", { cursor });
    },
  };
}
