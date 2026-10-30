import { expect, test } from "@jest/globals";
import { createReadyState } from "../../src/mail/ready-state.mjs";

test("settles readiness once with success or failure", async () => {
  const success = createReadyState();
  success.settle();
  success.settle(new Error("ignored"));
  await expect(success.ready).resolves.toBeUndefined();

  const failure = createReadyState();
  const error = new Error("not ready");
  failure.settle(error);
  failure.settle();
  await expect(failure.ready).rejects.toBe(error);
});
