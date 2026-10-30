import { isValidCursor } from "../websocket/cursor.mjs";

export function createEventProcessor({
  getCursor,
  setCursor,
  consumerId,
  acknowledgeEvent,
  onEvent,
  logs,
}) {
  return async function processEvent(event) {
    const eventCursor = event.cursor ?? event.event_id;
    if (!isValidCursor(eventCursor)) {
      throw new TypeError("event cursor must be a decimal Snowflake cursor");
    }
    const cursor = getCursor();
    if (cursor !== null && BigInt(eventCursor) <= BigInt(cursor)) {
      logs.eventSkipped(eventCursor);
      return;
    }
    logs.eventStarted(event?.event_type, eventCursor);
    await onEvent(event);
    if (consumerId !== undefined) await acknowledgeEvent(consumerId, eventCursor);
    setCursor(eventCursor);
    logs.eventCompleted(event?.event_type, eventCursor, consumerId !== undefined);
  };
}
