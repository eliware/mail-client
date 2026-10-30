import { createApiMethods } from "./api/methods.mjs";
import { createEventConnection } from "./event/connection.mjs";
import { createTransport } from "./transport.mjs";

export function createMailClient(options = {}) {
  const transport = createTransport(options);
  const api = createApiMethods(transport);
  return {
    ...api,
    connectEvents(eventOptions) {
      const settings = eventOptions ?? {};
      return createEventConnection({
        ...settings,
        baseUrl: transport.baseUrl,
        getAccessToken: options.getAccessToken,
        WebSocketImpl: settings.WebSocketImpl ?? options.WebSocketImpl,
        acknowledgeEvent: api.events.acknowledge,
        logger: settings.logger ?? options.logger,
      });
    },
  };
}
