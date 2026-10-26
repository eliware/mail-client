function withQuery(path, values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, String(item));
    } else {
      query.set(key, String(value));
    }
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

function itemPath(collection, id, suffix = "") {
  if (id === undefined || id === null || String(id).length === 0) {
    throw new TypeError("id must be a non-empty string or number");
  }
  return `/api/${collection}/${encodeURIComponent(String(id))}${suffix}`;
}

export function createApiMethods({ request, requestJson }) {
  const json = (method, path, body) =>
    requestJson(path, { method, ...(body === undefined ? {} : { body }) });
  const messages = {
    list: (filters) => requestJson(withQuery("/api/messages", filters)),
    unreadCount: () => requestJson("/api/messages/unread-count"),
    get: (id) => requestJson(itemPath("messages", id)),
    headers: (id) => requestJson(itemPath("messages", id, "/headers")),
    thread: (id) => requestJson(itemPath("messages", id, "/thread")),
    update: (id, changes) => json("PATCH", itemPath("messages", id), changes),
    delete: (id) => json("DELETE", itemPath("messages", id)),
  };
  const sent = {
    list: (filters) => requestJson(withQuery("/api/sent", filters)),
    get: (id) => requestJson(itemPath("sent", id)),
    status: (id) => requestJson(itemPath("sent", id, "/status")),
    retry: (id) => json("POST", itemPath("sent", id, "/retry")),
    cancel: (id) => json("POST", itemPath("sent", id, "/cancel")),
    delete: (id) => json("DELETE", itemPath("sent", id)),
    retryUncertain: (id, { deliveryId, confirmDuplicateRisk } = {}) => {
      if (confirmDuplicateRisk !== true) {
        throw new TypeError("confirmDuplicateRisk must be true for uncertain delivery retries");
      }
      if (typeof deliveryId !== "string" || deliveryId.length === 0) {
        throw new TypeError("deliveryId must be a non-empty string");
      }
      return json("POST", itemPath("sent", id, "/retry-uncertain"), {
        delivery_id: deliveryId,
        confirm_duplicate_risk: true,
      });
    },
  };
  const events = {
    read: ({ after, consumerId, limit } = {}) =>
      requestJson(
        withQuery("/api/events", {
          after,
          consumer_id: consumerId,
          limit,
        }),
      ),
    acknowledge: (consumerId, cursor) => {
      if (typeof consumerId !== "string" || consumerId.length === 0) {
        throw new TypeError("consumerId must be a non-empty string");
      }
      if (typeof cursor !== "string" || cursor.length === 0) {
        throw new TypeError("cursor must be a non-empty string");
      }
      return json("POST", "/api/events/ack", { consumer_id: consumerId, cursor });
    },
  };

  return {
    request,
    requestJson,
    auth: {
      requestBrowserToken: () => json("POST", "/api/auth/token"),
    },
    status: () => requestJson("/api/status"),
    inbox: { list: (filters) => requestJson(withQuery("/api/inbox", filters)) },
    messages,
    search: (query) => requestJson(withQuery("/api/search", { q: query })),
    sent,
    domains: {
      list: () => requestJson("/api/domains"),
      create: (domain) => json("POST", "/api/domains", { domain }),
      delete: (domain) => json("DELETE", itemPath("domains", domain)),
    },
    send: (message) => json("POST", "/api/send", message),
    sendMultipart: (formData) =>
      requestJson("/api/send-multipart", { method: "POST", body: formData }),
    attachments: {
      download: (id) => request(itemPath("attachments", id)),
    },
    events,
  };
}
