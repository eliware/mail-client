export type QueryValue =
  string | number | boolean | readonly (string | number)[] | null | undefined;
export type Query = Record<string, QueryValue>;

export interface JsonEnvelope<T = unknown> {
  data: T;
  request_id: string;
}

export interface MailLogger {
  debug(message: string, metadata?: Record<string, unknown>): unknown;
  warn(message: string, metadata?: Record<string, unknown>): unknown;
  error(message: string, metadata?: Record<string, unknown>): unknown;
}

export interface WebSocketFactory {
  new (url: string): WebSocket;
}

export interface MailClientOptions {
  baseUrl: string;
  getAccessToken: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
  WebSocketImpl?: WebSocketFactory;
  timeoutMs?: number;
  logger?: MailLogger;
}

export interface MailEvent {
  event_id: string;
  cursor?: string;
  event_type: string;
  occurred_at?: string;
  payload: unknown;
}

export interface EventConnectionOptions {
  after?: string;
  consumerId?: string;
  onEvent(event: MailEvent): void | Promise<void>;
  onError?(error: Error): void;
  autoReconnect?: boolean;
  retryDelayMs?: number;
  maxReconnectDelayMs?: number;
  WebSocketImpl?: WebSocketFactory;
}

export interface EventConnection {
  readonly ready: Promise<void>;
  readonly cursor: string | null;
  close(): void;
}

export interface MailSendRequest {
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject?: string;
  body?: string;
  html?: string;
  attachments?: unknown[];
  idempotencyKey?: string;
  replyToMessageId?: string;
  replyMode?: "reply" | "reply-all" | "forward";
  forwardMessageId?: string;
  [field: string]: unknown;
}

export interface DiscordLink {
  discord_channel_id: string;
  discord_message_id: string;
}

export interface DiscordLinkSaveInput {
  discordChannelId: string;
  discordMessageId: string;
}

export interface InboundDiscordLinkSaveResult {
  message_id: string;
  discord_links: DiscordLink[];
}

export interface SentDiscordLinkSaveResult {
  outbound_id: string;
  discord_links: DiscordLink[];
}

export interface DiscordMailLookupResult {
  mail_kind: "inbound" | "sent";
  mail_id: string;
}

export interface MailClient {
  request(path: string, options?: RequestInit): Promise<Response>;
  requestJson<T = unknown>(path: string, options?: RequestInit): Promise<T>;
  auth: {
    requestBrowserToken(): Promise<
      JsonEnvelope<{
        access_token: string;
        token_type: "Bearer";
        expires_in: number;
      }>
    >;
  };
  status(): Promise<JsonEnvelope<unknown>>;
  inbox: { list(filters?: Query): Promise<JsonEnvelope<unknown>> };
  messages: {
    list(filters?: Query): Promise<JsonEnvelope<unknown>>;
    unreadCount(): Promise<JsonEnvelope<unknown>>;
    get(id: string | number): Promise<JsonEnvelope<unknown>>;
    headers(id: string | number): Promise<JsonEnvelope<unknown>>;
    thread(id: string | number): Promise<JsonEnvelope<unknown>>;
    update(id: string | number, changes: Record<string, unknown>): Promise<JsonEnvelope<unknown>>;
    delete(id: string | number): Promise<JsonEnvelope<unknown>>;
    saveDiscordLink(
      id: string | number,
      link: DiscordLinkSaveInput,
    ): Promise<JsonEnvelope<InboundDiscordLinkSaveResult>>;
  };
  search(query: string): Promise<JsonEnvelope<unknown>>;
  sent: {
    list(filters?: Query): Promise<JsonEnvelope<unknown>>;
    get(id: string | number): Promise<JsonEnvelope<unknown>>;
    status(id: string | number): Promise<JsonEnvelope<unknown>>;
    retry(id: string | number): Promise<JsonEnvelope<unknown>>;
    cancel(id: string | number): Promise<JsonEnvelope<unknown>>;
    delete(id: string | number): Promise<JsonEnvelope<unknown>>;
    retryUncertain(
      id: string | number,
      options: { deliveryId: string; confirmDuplicateRisk: true },
    ): Promise<JsonEnvelope<unknown>>;
    saveDiscordLink(
      id: string | number,
      link: DiscordLinkSaveInput,
    ): Promise<JsonEnvelope<SentDiscordLinkSaveResult>>;
  };
  discordLinks: {
    find(
      discordChannelId: string,
      discordMessageId: string,
    ): Promise<JsonEnvelope<DiscordMailLookupResult>>;
  };
  domains: {
    list(): Promise<JsonEnvelope<unknown>>;
    create(domain: string): Promise<JsonEnvelope<unknown>>;
    delete(domain: string): Promise<JsonEnvelope<unknown>>;
  };
  send(message: MailSendRequest): Promise<JsonEnvelope<unknown>>;
  sendMultipart(formData: FormData): Promise<JsonEnvelope<unknown>>;
  attachments: { download(id: string | number): Promise<Response> };
  events: {
    read(options?: {
      after?: string;
      consumerId?: string;
      limit?: number;
    }): Promise<JsonEnvelope<unknown>>;
    acknowledge(consumerId: string, cursor: string): Promise<JsonEnvelope<unknown>>;
  };
  connectEvents(options: EventConnectionOptions): EventConnection;
}

export class MailApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly payload: unknown;
}

export function createMailClient(options: MailClientOptions): MailClient;
