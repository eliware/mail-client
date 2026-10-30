import { expect, jest, test } from "@jest/globals";
import { createEventProcessor } from "../../../src/mail/event/processor.mjs";

function createProcessor(overrides = {}) {
  let cursor = null;
  const logs = {
    eventSkipped: jest.fn(),
    eventStarted: jest.fn(),
    eventCompleted: jest.fn(),
  };
  const process = createEventProcessor({
    getCursor: () => cursor,
    setCursor: (value) => {
      cursor = value;
    },
    onEvent: jest.fn(),
    logs,
    ...overrides,
  });
  return { process, logs, getCursor: () => cursor };
}

test("processes a new event and saves its cursor after handler success", async () => {
  const onEvent = jest.fn();
  const acknowledgeEvent = jest.fn();
  const state = createProcessor({
    consumerId: "worker",
    acknowledgeEvent,
    onEvent,
  });

  await state.process({ event_id: "1", event_type: "message.created" });

  expect(onEvent).toHaveBeenCalled();
  expect(acknowledgeEvent).toHaveBeenCalledWith("worker", "1");
  expect(state.getCursor()).toBe("1");
  expect(state.logs.eventCompleted).toHaveBeenCalledWith("message.created", "1", true);
});

test("skips old events and fails invalid cursors or unsuccessful handlers", async () => {
  let cursor = "4";
  const state = createProcessor({
    getCursor: () => cursor,
    setCursor: (value) => (cursor = value),
  });

  await state.process({ event_id: "4" });
  expect(state.logs.eventSkipped).toHaveBeenCalledWith("4");
  await expect(state.process({ event_id: "bad" })).rejects.toThrow("decimal Snowflake cursor");

  const fail = createProcessor({
    onEvent: async () => {
      throw new Error("handler failed");
    },
  });
  await expect(fail.process({ cursor: "5" })).rejects.toThrow("handler failed");
  expect(fail.getCursor()).toBeNull();
});
