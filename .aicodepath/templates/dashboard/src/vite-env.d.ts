/// <reference types="vite/client" />

declare module 'jest-websocket-mock' {
  export default class WS {
    constructor(url: string, opts?: Record<string, unknown>);
    connected: Promise<WebSocket>;
    closed: Promise<unknown>;
    nextMessage: Promise<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send(data: any): void;
    close(options?: { code?: number; reason?: string; wasClean?: boolean }): void;
    error(options?: { code?: number; reason?: string; wasClean?: boolean }): void;
    static clean(): void;
  }
}
