const httpUrl = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:8787";

export const SERVER_HTTP_URL = httpUrl.replace(/\/$/, "");
export const SERVER_WS_URL = SERVER_HTTP_URL.replace(/^http/, "ws");
