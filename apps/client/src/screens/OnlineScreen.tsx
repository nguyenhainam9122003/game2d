import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { isValidRoomCode, normalizeRoomCode } from "@game/protocol";
import type { GameId } from "@game/protocol";
import { ownPits, getGoScore, passMove, FIRE_OFFSET, PLANE_FIRE_OFFSET, DRAW_MOVE, PASS_MOVE } from "@game/engine";
import { useAppStore } from "../store";
import { useSettingsStore } from "../settingsStore";
import { createRoom } from "../net/roomClient";
import { useNetworkGame } from "../net/useNetworkGame";
import { getGame } from "../gameRegistry";
import { TicTacToeBoard } from "../components/TicTacToeBoard";
import { GomokuBoard } from "../components/GomokuBoard";
import { OAnQuanBoard } from "../components/OAnQuanBoard";
import { ChessBoard } from "../components/ChessBoard";
import { XiangqiBoard } from "../components/XiangqiBoard";
import { GoBoard } from "../components/GoBoard";
import { BattleshipBoard } from "../components/BattleshipBoard";
import { BattleshipPlacement } from "../components/BattleshipPlacement";
import { PlaneBattlePlacement } from "../components/PlaneBattlePlacement";
import { DominoBoard } from "../components/DominoBoard";

function inviteLink(code: string): string {
  const url = new URL(window.location.href);
  url.search = `?room=${code}`;
  return url.toString();
}

export function OnlineScreen() {
  const { t } = useTranslation();
  const { gameId, goToGameDetail, goHome, pendingRoomCode, clearPendingRoomCode } = useAppStore();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Joining via the header's "Vào bàn" quick-join skips picking a game first,
  // so leaving the room should return Home instead of a (likely unrelated) game's detail screen.
  const [quickJoined, setQuickJoined] = useState(false);

  useEffect(() => {
    if (pendingRoomCode) {
      setRoomCode(pendingRoomCode);
      setQuickJoined(true);
      clearPendingRoomCode();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get("room");
    if (fromLink) {
      const normalized = normalizeRoomCode(fromLink);
      if (isValidRoomCode(normalized)) setRoomCode(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const { code } = await createRoom(gameId);
      setRoomCode(code);
    } catch {
      setCreateError(t("online.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  function handleJoin() {
    const normalized = normalizeRoomCode(joinInput);
    if (isValidRoomCode(normalized)) setRoomCode(normalized);
  }

  if (roomCode) {
    return (
      <NetworkRoom
        code={roomCode}
        requestedGameId={gameId}
        onLeave={() => {
          setRoomCode(null);
          if (quickJoined) goHome();
          else goToGameDetail();
        }}
      />
    );
  }

  return (
    <div className="game-screen">
      <div className="card" style={{ width: "100%", textAlign: "center" }}>
        <p className="section-title">{t("online.createRoom")}</p>
        <button className="primary-button" onClick={handleCreate} disabled={creating}>
          {creating ? t("online.creating") : t("online.createRoom")}
        </button>
        {createError && <p style={{ color: "var(--color-player2)" }}>{createError}</p>}
      </div>

      <div className="card" style={{ width: "100%" }}>
        <p className="section-title">{t("online.join")}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="text-input"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            placeholder={t("online.enterCode")}
            maxLength={8}
            style={{ flex: 1, fontSize: "1.1rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
          />
          <button
            className="secondary-button"
            onClick={handleJoin}
            disabled={!isValidRoomCode(normalizeRoomCode(joinInput))}
          >
            {t("online.join")}
          </button>
        </div>
      </div>

      <button className="secondary-button" onClick={goToGameDetail}>
        {t("game.back")}
      </button>
    </div>
  );
}

function NetworkRoom({
  code,
  requestedGameId,
  onLeave,
}: {
  code: string;
  requestedGameId: GameId;
  onLeave(): void;
}) {
  const { t } = useTranslation();
  const { chatEnabled } = useSettingsStore();
  const net = useNetworkGame(code, requestedGameId);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    QRCode.toDataURL(inviteLink(code), { margin: 1, width: 180 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [code]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink(code));
    } catch {
      // clipboard unavailable; the code is shown on screen regardless
    }
  }

  if (net.phase === "connecting") {
    return <p className="status-banner">{t("online.connecting")}</p>;
  }

  if (net.phase === "room-full") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p>{t("online.roomFull")}</p>
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
      </div>
    );
  }

  if (net.phase === "closed") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p>{t("online.disconnected")}</p>
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
      </div>
    );
  }

  if (net.phase === "waiting") {
    return (
      <div className="card room-wait-card">
        <p className="section-title" style={{ margin: 0 }}>
          {t("online.waitingForOpponent")}
        </p>
        <div className="room-code-chip">{code}</div>
        {qrDataUrl && (
          <div className="qr-card">
            <img src={qrDataUrl} alt="QR" />
          </div>
        )}
        <button className="secondary-button" onClick={copyLink}>
          🔗 {t("online.copyLink")}
        </button>
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
      </div>
    );
  }

  // playing
  const { game } = getGame(net.activeGameId);
  const state = net.state as any;
  const result = game.result(state);
  const currentPlayer = game.currentPlayer(state);
  const isMyTurn = net.mySlot !== null && currentPlayer === net.mySlot;

  function playerLabel(slot: number): string {
    return slot === net.mySlot ? t("game.you") : t("online.opponent");
  }

  let status: string;
  if (result.status === "win") {
    status = t("game.win", { player: playerLabel(result.winner) });
  } else if (result.status === "draw") {
    status = t("game.draw");
  } else if (!net.opponentConnected) {
    status = t("online.opponentDisconnected");
  } else if ((net.activeGameId === "battleship" || net.activeGameId === "plane-battle") && state.phase === "placement") {
    status = t("battleship.placeShips");
  } else {
    status = t("game.turnOf", { player: isMyTurn ? t("game.you") : t("online.opponent") });
  }

  function handleCellClick(index: number) {
    if (result.status !== "ongoing" || !isMyTurn || !net.opponentConnected) return;
    net.sendMove(index);
  }

  function handleSendChat() {
    const text = chatInput.trim();
    if (!text) return;
    net.sendChat(text);
    setChatInput("");
  }

  const quickReplies = [
    t("online.quickReply1"),
    t("online.quickReply2"),
    t("online.quickReply3"),
    t("online.quickReply4"),
    t("online.quickReply5"),
  ];

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={() => net.restart()}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${result.status === "win" ? "win" : ""}`}>{status}</p>

      {net.activeGameId === "o-an-quan" && (
        <div className="oaq-scoreboard">
          <span>
            {t("game.player1")}: {state.captured[0]}
          </span>
          <span>
            {t("game.player2")}: {state.captured[1]}
          </span>
        </div>
      )}

      {net.activeGameId === "tic-tac-toe" && (
        <TicTacToeBoard
          state={state}
          winningLine={result.status === "win" ? result.line : undefined}
          disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
          onCellClick={handleCellClick}
        />
      )}
      {net.activeGameId === "gomoku" && (
        <GomokuBoard
          state={state}
          winningLine={result.status === "win" ? result.line : undefined}
          disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
          onCellClick={handleCellClick}
        />
      )}
      {net.activeGameId === "chess" && (
        <ChessBoard
          state={state}
          legalMoves={
            result.status === "ongoing" && isMyTurn && net.opponentConnected ? game.legalMoves(state) : []
          }
          disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
          onMove={handleCellClick}
        />
      )}
      {net.activeGameId === "o-an-quan" && (
        <OAnQuanBoard
          state={state}
          selectablePits={
            result.status === "ongoing" && isMyTurn && net.opponentConnected
              ? ownPits(currentPlayer)
              : []
          }
          onPitClick={handleCellClick}
        />
      )}
      {net.activeGameId === "xiangqi" && (
        <XiangqiBoard
          state={state}
          legalMoves={
            result.status === "ongoing" && isMyTurn && net.opponentConnected ? game.legalMoves(state) : []
          }
          disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
          onMove={handleCellClick}
        />
      )}
      {net.activeGameId === "go" && (
        <>
          <p className="go-score-line">
            {t("game.goScore", { ...getGoScore(state) })}
          </p>
          <GoBoard
            state={state}
            legalMoves={
              result.status === "ongoing" && isMyTurn && net.opponentConnected ? game.legalMoves(state) : []
            }
            disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
            onCellClick={handleCellClick}
          />
          {result.status === "ongoing" && isMyTurn && net.opponentConnected && (
            <button className="secondary-button" onClick={() => net.sendMove(passMove(state.size))}>
              {t("game.pass")}
            </button>
          )}
        </>
      )}
      {net.activeGameId === "battleship" && net.mySlot !== null && (
        <>
          {state.phase === "placement" ? (
            isMyTurn ? (
              <BattleshipPlacement size={state.size} onReady={(move) => net.sendMove(move)} />
            ) : (
              <p className="status-banner">{t("battleship.waitingOpponent")}</p>
            )
          ) : (
            (() => {
              const viewerIdx = net.mySlot! - 1;
              const opponentIdx = viewerIdx === 0 ? 1 : 0;
              return (
                <>
                  <p className="section-title">{t("battleship.yourBoard")}</p>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[viewerIdx] ?? []}
                    shotsAtThisBoard={state.shots[opponentIdx]}
                    revealShips
                    clickable={false}
                  />
                  <p className="section-title">{t("battleship.enemyBoard")}</p>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[opponentIdx] ?? []}
                    shotsAtThisBoard={state.shots[viewerIdx]}
                    revealShips={false}
                    clickable={result.status === "ongoing" && isMyTurn && net.opponentConnected}
                    onCellClick={(cell) => net.sendMove(FIRE_OFFSET + cell)}
                  />
                </>
              );
            })()
          )}
        </>
      )}
      {net.activeGameId === "plane-battle" && net.mySlot !== null && (
        <>
          {state.phase === "placement" ? (
            isMyTurn ? (
              <PlaneBattlePlacement size={state.size} planeCount={state.planeCount} onReady={(move) => net.sendMove(move)} />
            ) : (
              <p className="status-banner">{t("battleship.waitingOpponent")}</p>
            )
          ) : (
            (() => {
              const viewerIdx = net.mySlot! - 1;
              const opponentIdx = viewerIdx === 0 ? 1 : 0;
              return (
                <>
                  <p className="section-title">{t("battleship.yourBoard")}</p>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[viewerIdx] ?? []}
                    shotsAtThisBoard={state.shots[opponentIdx]}
                    revealShips
                    clickable={false}
                  />
                  <p className="section-title">{t("battleship.enemyBoard")}</p>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[opponentIdx] ?? []}
                    shotsAtThisBoard={state.shots[viewerIdx]}
                    revealShips={false}
                    clickable={result.status === "ongoing" && isMyTurn && net.opponentConnected}
                    onCellClick={(cell) => net.sendMove(PLANE_FIRE_OFFSET + cell)}
                  />
                </>
              );
            })()
          )}
        </>
      )}
      {net.activeGameId === "domino" && net.mySlot !== null && (
        <>
          <p className="domino-meta">
            {t("domino.boneyard", { count: state.boneyard.length })} ·{" "}
            {t("domino.opponentTiles", { player: t("online.opponent"), count: state.hands[net.mySlot === 1 ? 1 : 0].length })}
          </p>
          <DominoBoard
            state={state}
            hand={state.hands[net.mySlot - 1]}
            legalMoves={result.status === "ongoing" && isMyTurn && net.opponentConnected ? game.legalMoves(state) : []}
            disabled={result.status !== "ongoing" || !isMyTurn || !net.opponentConnected}
            onPlay={handleCellClick}
          />
          {isMyTurn && net.opponentConnected && game.legalMoves(state).includes(DRAW_MOVE) && (
            <button className="primary-button" onClick={() => net.sendMove(DRAW_MOVE)}>
              {t("domino.draw")}
            </button>
          )}
          {isMyTurn && net.opponentConnected && game.legalMoves(state).includes(PASS_MOVE) && (
            <button className="primary-button" onClick={() => net.sendMove(PASS_MOVE)}>
              {t("domino.pass")}
            </button>
          )}
        </>
      )}

      {chatEnabled && (
        <div className="card" style={{ width: "100%" }}>
          <div style={{ maxHeight: 120, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
            {net.chat.map((c, i) => (
              <p key={i} style={{ margin: 0 }}>
                <strong>{c.from === net.mySlot ? t("game.you") : t("online.opponent")}:</strong> {c.text}
              </p>
            ))}
          </div>
          <div className="quick-replies">
            {quickReplies.map((reply) => (
              <button key={reply} className="quick-reply-chip" onClick={() => net.sendChat(reply)}>
                {reply}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="text-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder={t("online.chatPlaceholder")}
              style={{ flex: 1, padding: "8px 12px" }}
            />
            <button className="secondary-button" onClick={handleSendChat}>
              {t("online.send")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
