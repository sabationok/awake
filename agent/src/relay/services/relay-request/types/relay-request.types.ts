/** `data` події `relay:request` від webhooxy (docs/relay-contract.md → «webhooxy: relay:request»). */
export interface RelayHttpRequest {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  body: unknown;
  bodyEncoding: 'json' | 'text' | 'base64';
}

export interface RelayResponseCookie {
  name: string;
  value: string;
  maxAge?: number;
  path?: string;
  httpOnly?: boolean;
  sameSite?: 'lax' | 'strict';
}

/** `data` в ack хоста: HTTP-відповідь, яку webhooxy віддасть проксі Web UI. */
export interface RelayHttpResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: unknown;
  bodyEncoding?: 'json' | 'text' | 'base64';
  cookies?: RelayResponseCookie[];
}
