export function createReadyState() {
  let settled = false;
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  void ready.catch(() => {});

  function settle(error) {
    if (settled) return;
    settled = true;
    if (error) rejectReady(error);
    else resolveReady();
  }

  return { ready, settle };
}
