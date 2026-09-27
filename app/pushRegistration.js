// Keep registration alive across transient network failures; cancel on account/token changes.
export function startPushRegistration({ register, onSuccess, onFailure, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false;
  let timer;
  let attempt = 0;
  let controller;
  const run = async () => {
    controller = new AbortController();
    const deadline = schedule(() => controller.abort(), 10000);
    try {
      await register(controller.signal);
      if (!stopped) onSuccess();
    } catch (error) {
      if (!stopped) {
        onFailure(error);
        // Authentication failures need refreshed credentials, not repeated requests.
        if (error.status !== 401 && error.status !== 403) {
          timer = schedule(run, Math.min(5000 * 2 ** attempt++, 60000));
        }
      }
    } finally { cancel(deadline); }
  };
  run();
  return () => { stopped = true; cancel(timer); controller?.abort(); };
}
