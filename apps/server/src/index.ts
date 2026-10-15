import { generateRoomCode, isValidRoomCode, normalizeRoomCode, type GameId } from "@game/protocol";
import { GameRoom, type Env } from "./GameRoom.js";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...(init.headers ?? {}) },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Room codes are generated statelessly here — the Durable Object for a
    // code is only created lazily once the first WebSocket connects to it.
    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const body = await request.json<{ gameId?: string }>().catch(() => ({} as { gameId?: string }));
      const gameId: GameId = body.gameId === "gomoku" ? "gomoku" : "tic-tac-toe";
      return json({ code: generateRoomCode(), gameId });
    }

    const match = url.pathname.match(/^\/room\/([A-Za-z0-9]+)\/ws$/);
    if (match) {
      const code = normalizeRoomCode(match[1]);
      if (!isValidRoomCode(code)) {
        return json({ error: "Mã phòng không hợp lệ" }, { status: 400 });
      }
      const id = env.GAME_ROOM.idFromName(code);
      const stub = env.GAME_ROOM.get(id);

      const forwardUrl = new URL(request.url);
      forwardUrl.pathname = "/websocket";
      forwardUrl.searchParams.set("code", code);
      return stub.fetch(new Request(forwardUrl.toString(), request));
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};

export { GameRoom };
