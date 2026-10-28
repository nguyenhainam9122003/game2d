import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { isValidRoomCode, normalizeRoomCode } from "@game/protocol";
import type { GameId, RoomConfig } from "@game/protocol";
import {
  ownPits,
  getGoScore,
  passMove,
  confirmMarkingMove,
  FIRE_OFFSET,
  PLANE_FIRE_OFFSET,
  DRAW_MOVE,
  PASS_MOVE,
  otherPlayer,
  numberMatchPassMove,
  liveNeighbors,
  canMatch,
  generateSudoku,
  findConflicts,
  isSudokuSolved,
  type SudokuGrid,
} from "@game/engine";
import { useAppStore } from "../store";
import { useSettingsStore } from "../settingsStore";
import { usePlayOptionsStore } from "../playOptionsStore";
import { useGameOptionsStore, sudokuMistakeLimitOf } from "../gameOptionsStore";
import { useGameClock } from "../useGameClock";
import { useMatchSeries } from "../useMatchSeries";
import { createRoom } from "../net/roomClient";
import { useNetworkGame } from "../net/useNetworkGame";
import { getGame, getBotMove } from "../gameRegistry";
import { TicTacToeBoard } from "../components/TicTacToeBoard";
import { GomokuBoard } from "../components/GomokuBoard";
import { OAnQuanBoard } from "../components/OAnQuanBoard";
import { ChessBoard } from "../components/ChessBoard";
import { XiangqiBoard } from "../components/XiangqiBoard";
import { GoBoard } from "../components/GoBoard";
import { BattleshipBoard } from "../components/BattleshipBoard";
import { BattleshipPlacement } from "../components/BattleshipPlacement";
import { ClockDisplay } from "../components/ClockDisplay";
import { MatchSeriesBanner } from "../components/MatchSeriesBanner";
import { PlaneBattlePlacement } from "../components/PlaneBattlePlacement";
import { DominoBoard } from "../components/DominoBoard";
import { NumberMatchBoard } from "../components/NumberMatchBoard";
import { SudokuBoard } from "../components/SudokuBoard";

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
  // Sudoku has no `Game<S,M>` engine (not turn-based) — it gets its own component with its own
  // `useNetworkGame` call instead of sharing the turn-based machinery below (currentPlayer,
  // clock, legalMoves — none of which apply to it). Must return before any hook in THIS
  // component runs, which is fine: React just mounts a different component tree below.
  if (requestedGameId === "sudoku") {
    return <SudokuOnlineRoom code={code} onLeave={onLeave} />;
  }

  const { t } = useTranslation();
  const { chatEnabled, hintsEnabled } = useSettingsStore();
  const playOptions = usePlayOptionsStore();
  const gameOptions = useGameOptionsStore();
  // Sent on "join" so a brand-new room picks up the creator's local options
  // (clock, match length, per-game rules) instead of hardcoded defaults —
  // the server ignores it when joining an already-started room.
  const gameConfig: RoomConfig = {
    clockMode: playOptions.clockMode,
    clockInitialSeconds: playOptions.clockInitialSeconds,
    clockIncrementSeconds: playOptions.clockIncrementSeconds,
    perMoveSeconds: playOptions.perMoveSeconds,
    matchLength: playOptions.matchLength,
    goBoardSize: gameOptions.goBoardSize,
    goDeadStoneMode: gameOptions.goDeadStoneMode,
    planeBattleVariant: gameOptions.planeBattleVariant,
    battleshipHuntRule: gameOptions.battleshipHuntRule,
    dominoDrawRule: gameOptions.dominoDrawRule,
    sudokuTwoPlayerMode: gameOptions.sudokuTwoPlayerMode,
  };
  const net = useNetworkGame(code, requestedGameId, gameConfig);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [notedCells, setNotedCells] = useState<Set<number>>(new Set());
  const [noteMode, setNoteMode] = useState(false);
  const [nmSelected, setNmSelected] = useState<number | null>(null); // Ghép số's 2-click pair pick
  const [hintedMove, setHintedMove] = useState<number | null>(null); // Đô-mi-nô's "Gợi ý"

  // Computed unconditionally (before the phase-based early returns below) since the clock
  // hook must always run — `net.state` already holds a valid init()'d state in every phase.
  const { game } = getGame(net.activeGameId);
  const state = net.state as any;
  const currentPlayer = game.currentPlayer(state);
  const rawResult = game.result(state);
  const result = net.timedOutLoser ? ({ status: "win" as const, winner: otherPlayer(net.timedOutLoser) }) : rawResult;

  const clockConfig = net.effectiveConfig ?? gameConfig;
  // Matches the local vs-bot/2-player screens: ship placement is an untimed setup step (only
  // "battle" is timed) for Battleship/Plane Battle — every other game's state has no `.phase`
  // at all (or Go's "marking", which should stay timed), so this check only ever excludes those two.
  const clockOngoing = result.status === "ongoing" && net.opponentConnected && state.phase !== "placement";
  const clock = useGameClock(clockConfig, currentPlayer, clockOngoing, () => {
    if (clockConfig.clockMode === "clock") {
      net.reportTimeout();
    } else if (clockConfig.clockMode === "per-move" && net.mySlot === currentPlayer) {
      // No bot is already driving anyone online, so the timed-out player's own client auto-plays
      // an easy move for themself — mirrors "2 người chung máy"'s per-move bailout.
      net.sendMove(getBotMove(net.activeGameId, state));
    }
  });

  // Matches the local vs-bot/2-player screens: both clients derive the same tally from the
  // same synced results, so no server-side state is needed — "Ván tiếp" below just starts the
  // next game (net.restart()) without touching this, while the toolbar's "Chơi lại" resets both.
  // Ghép số has no "Số ván" selector on rachoi.app — always a single round, so it ignores the
  // shared global matchLength (which some other game's choice could otherwise leak in here).
  const series = useMatchSeries(net.activeGameId === "number-match" ? 1 : clockConfig.matchLength);
  const recordedRef = useRef(false);
  useEffect(() => {
    if (result.status === "ongoing") {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;
    series.recordRoundResult(result.status === "win" ? result.winner : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.status]);

  function toggleNote(cell: number) {
    setNotedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cell)) next.delete(cell);
      else next.add(cell);
      return next;
    });
  }

  useEffect(() => {
    QRCode.toDataURL(inviteLink(code), { margin: 1, width: 180 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [code]);

  useEffect(() => {
    clock.reset();
    setNotedCells(new Set());
    setNmSelected(null);
    setHintedMove(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net.roundVersion]);

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

  // playing (game/state/currentPlayer/result were already computed above, before the early returns)
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
  } else if (net.activeGameId === "go" && state.phase === "marking") {
    status = t("game.markingDeadStones");
  } else {
    status = t("game.turnOf", { player: isMyTurn ? t("game.you") : t("online.opponent") });
  }

  function handleCellClick(index: number) {
    if (result.status !== "ongoing" || !isMyTurn || !net.opponentConnected) return;
    net.sendMove(index);
    setHintedMove(null);
  }

  function handleDominoHint() {
    if (!isMyTurn || !net.opponentConnected || game.legalMoves(state).length === 0) return;
    setHintedMove(getBotMove("domino", state, "hard"));
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
        <button
          className="secondary-button"
          onClick={() => {
            net.restart();
            series.resetSeries();
          }}
        >
          {t("game.restart")}
        </button>
        <button
          className="secondary-button"
          onClick={() => net.requestUndo()}
          disabled={
            result.status !== "ongoing" ||
            !net.opponentConnected ||
            net.undoRequestedByMe ||
            net.incomingUndoRequest
          }
        >
          {t("game.undo")}
        </button>
      </div>

      {net.undoRequestedByMe && <p className="status-banner">{t("online.undoWaiting")}</p>}
      {net.incomingUndoRequest && (
        <div className="card" style={{ width: "100%", textAlign: "center" }}>
          <p style={{ margin: "0 0 8px" }}>{t("online.undoIncoming")}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button className="primary-button" onClick={() => net.respondUndo(true)}>
              {t("online.undoAccept")}
            </button>
            <button className="secondary-button" onClick={() => net.respondUndo(false)}>
              {t("online.undoDecline")}
            </button>
          </div>
        </div>
      )}

      <ClockDisplay
        remainingMs={clock.remainingMs}
        perMoveMsLeft={clock.perMoveMsLeft}
        currentPlayer={currentPlayer}
        player1Label={playerLabel(1)}
        player2Label={playerLabel(2)}
      />

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
          {state.phase === "marking" && result.status === "ongoing" && isMyTurn && net.opponentConnected && (
            <button className="primary-button" onClick={() => net.sendMove(confirmMarkingMove(state.size))}>
              {t("game.confirmMarking")}
            </button>
          )}
          {state.phase === "playing" && result.status === "ongoing" && isMyTurn && net.opponentConnected && (
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
                  <div className="game-toolbar">
                    <p className="section-title" style={{ margin: 0 }}>
                      {t("battleship.enemyBoard")}
                    </p>
                    <button className={`secondary-button ${noteMode ? "active" : ""}`} onClick={() => setNoteMode((v) => !v)}>
                      {noteMode ? t("battleship.notesOn") : t("battleship.notesOff")}
                    </button>
                  </div>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[opponentIdx] ?? []}
                    shotsAtThisBoard={state.shots[viewerIdx]}
                    revealShips={false}
                    notedCells={notedCells}
                    clickable={noteMode || (result.status === "ongoing" && isMyTurn && net.opponentConnected)}
                    onCellClick={noteMode ? toggleNote : (cell) => net.sendMove(FIRE_OFFSET + cell)}
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
                  <div className="game-toolbar">
                    <p className="section-title" style={{ margin: 0 }}>
                      {t("battleship.enemyBoard")}
                    </p>
                    <button className={`secondary-button ${noteMode ? "active" : ""}`} onClick={() => setNoteMode((v) => !v)}>
                      {noteMode ? t("battleship.notesOn") : t("battleship.notesOff")}
                    </button>
                  </div>
                  <BattleshipBoard
                    size={state.size}
                    ships={state.fleets[opponentIdx] ?? []}
                    shotsAtThisBoard={state.shots[viewerIdx]}
                    revealShips={false}
                    notedCells={notedCells}
                    clickable={noteMode || (result.status === "ongoing" && isMyTurn && net.opponentConnected)}
                    onCellClick={noteMode ? toggleNote : (cell) => net.sendMove(PLANE_FIRE_OFFSET + cell)}
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
            hintedTile={hintedMove !== null ? Math.floor(hintedMove / 2) : null}
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
          {hintsEnabled && gameOptions.dominoHintsEnabled && result.status === "ongoing" && isMyTurn && net.opponentConnected && (
            <button className="secondary-button" onClick={handleDominoHint}>
              💡 {t("domino.hint")}
            </button>
          )}
        </>
      )}

      {net.activeGameId === "number-match" &&
        (() => {
          const nmPartners =
            nmSelected !== null && gameOptions.numberMatchHintsVisible
              ? liveNeighbors(state.cells, nmSelected).filter((n: number) => canMatch(state.cells[nmSelected].value, state.cells[n].value))
              : [];
          function handleNumberMatchCellClick(index: number) {
            if (result.status !== "ongoing" || !isMyTurn || !net.opponentConnected || state.cells[index].crossed) return;
            if (nmSelected === null) {
              setNmSelected(index);
              return;
            }
            if (nmSelected === index) {
              setNmSelected(null);
              return;
            }
            const a = Math.min(nmSelected, index);
            const b = Math.max(nmSelected, index);
            const move = a * state.cells.length + b;
            if (!game.legalMoves(state).includes(move)) {
              setNmSelected(index);
              return;
            }
            net.sendMove(move);
            setNmSelected(null);
          }
          return (
            <>
              <div className="oaq-scoreboard">
                <span>{t("numberMatch.pairsCount", { player: playerLabel(1), count: state.captured[0] })}</span>
                <span>{t("numberMatch.pairsCount", { player: playerLabel(2), count: state.captured[1] })}</span>
              </div>
              <NumberMatchBoard
                cells={state.cells}
                selected={nmSelected}
                partners={nmPartners}
                onCellClick={handleNumberMatchCellClick}
              />
              {result.status === "ongoing" && isMyTurn && net.opponentConnected && (
                <button className="secondary-button" onClick={() => net.sendMove(numberMatchPassMove(state.cells.length))}>
                  {t("game.pass")}
                </button>
              )}
            </>
          );
        })()}

      {result.status !== "ongoing" && (
        <MatchSeriesBanner series={series} onNextRound={() => net.restart()} />
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

interface SudokuLocalState {
  notes: Set<number>[];
  mistakes: number;
  hintsLeft: number;
  raceValues: SudokuGrid | null;
}

function newSudokuLocalState(givens: SudokuGrid, hintBudget: number, isRace: boolean): SudokuLocalState {
  return {
    notes: Array.from({ length: 81 }, () => new Set<number>()),
    mistakes: 0,
    hintsLeft: hintBudget,
    raceValues: isRace ? [...givens] : null,
  };
}

/**
 * Sudoku's "Chơi với bạn mình" — rachoi.app's real structure (confirmed on the live site) is
 * "Hai người: Đua" (race — each side solves their own copy of the same puzzle, first correct
 * finish wins) or "Cùng giải" (co-op — one shared grid, anyone can edit any cell any time, done
 * together when it's solved). Neither fits the turn-based `Game<S,M>` interface, so this talks
 * to the 3 ad-hoc `sudoku*` protocol messages directly instead of `sendMove`/`state`.
 */
function SudokuOnlineRoom({ code, onLeave }: { code: string; onLeave(): void }) {
  const { t } = useTranslation();
  const { difficulty } = useAppStore();
  const { hintsEnabled } = useSettingsStore();
  const playOptions = usePlayOptionsStore();
  const gameOptions = useGameOptionsStore();
  const gameConfig: RoomConfig = {
    clockMode: "none",
    clockInitialSeconds: playOptions.clockInitialSeconds,
    clockIncrementSeconds: playOptions.clockIncrementSeconds,
    perMoveSeconds: playOptions.perMoveSeconds,
    matchLength: playOptions.matchLength,
    goBoardSize: gameOptions.goBoardSize,
    goDeadStoneMode: gameOptions.goDeadStoneMode,
    planeBattleVariant: gameOptions.planeBattleVariant,
    battleshipHuntRule: gameOptions.battleshipHuntRule,
    dominoDrawRule: gameOptions.dominoDrawRule,
    sudokuTwoPlayerMode: gameOptions.sudokuTwoPlayerMode,
  };
  const net = useNetworkGame(code, "sudoku", gameConfig);
  const mode = net.effectiveConfig?.sudokuTwoPlayerMode ?? gameConfig.sudokuTwoPlayerMode;
  const isCoop = mode === "co-op";

  const givens = net.sudokuPuzzle?.givens ?? null;
  const solution = net.sudokuPuzzle?.solution ?? null;

  const [local, setLocal] = useState<SudokuLocalState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const sentPuzzleRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const reportedDoneRef = useRef(false);

  // `roundVersion` bumps on every restart (mine or the opponent's) — the one reliable signal
  // that a fresh puzzle is coming, since `net.sudokuPuzzle` turning null and this effect's own
  // ref resets would otherwise race across renders.
  useEffect(() => {
    sentPuzzleRef.current = false;
    reportedDoneRef.current = false;
    startedAtRef.current = null;
    setLocal(null);
    setSelected(null);
  }, [net.roundVersion]);

  // Only slot 1 (the room creator) generates the shared puzzle, once per round.
  useEffect(() => {
    if (net.mySlot === 1 && !net.sudokuPuzzle && !sentPuzzleRef.current) {
      sentPuzzleRef.current = true;
      const puzzle = generateSudoku(difficulty);
      net.sendSudokuPuzzle(puzzle.givens, puzzle.solution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net.mySlot, net.sudokuPuzzle, net.roundVersion]);

  useEffect(() => {
    if (givens && !local) {
      setLocal(newSudokuLocalState(givens, gameOptions.sudokuHintBudget, !isCoop));
      startedAtRef.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [givens, local]);

  const values: SudokuGrid | null = isCoop ? net.sudokuGrid ?? givens : local?.raceValues ?? null;
  const mistakeLimit = sudokuMistakeLimitOf(gameOptions.sudokuErrorMode);
  const showErrors = gameOptions.sudokuErrorMode !== "off";
  const conflicts = useMemo(
    () => (showErrors && values ? findConflicts(values) : new Set<number>()),
    [values, showErrors],
  );
  const solved = values && solution ? isSudokuSolved(values, solution) : false;
  const lost = mistakeLimit !== null && (local?.mistakes ?? 0) >= mistakeLimit;
  const myTurnOver = solved || lost || (mode === "race" && net.sudokuWinner !== null);

  useEffect(() => {
    if (mode === "race" && solved && !reportedDoneRef.current && startedAtRef.current !== null) {
      reportedDoneRef.current = true;
      net.sendSudokuDone(Date.now() - startedAtRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, mode]);

  function setCell(index: number, value: number | null) {
    if (isCoop) net.sendSudokuCell(index, value);
    setLocal((l) => (l && !isCoop ? { ...l, raceValues: l.raceValues!.map((v, i) => (i === index ? value : v)) } : l));
  }

  function handleSelect(index: number) {
    if (myTurnOver) return;
    setSelected(index);
  }

  function handleDigit(digit: number) {
    if (myTurnOver || selected === null || !local || !values || !solution || givens?.[selected] !== null) return;
    if (notesMode) {
      setLocal((l) => {
        if (!l) return l;
        const notes = l.notes.map((s) => new Set(s));
        if (notes[selected].has(digit)) notes[selected].delete(digit);
        else notes[selected].add(digit);
        return { ...l, notes };
      });
      return;
    }
    const current = values[selected];
    const next = current === digit ? null : digit;
    const wasWrong = next !== null && next !== solution[selected];
    setLocal((l) => {
      if (!l) return l;
      const notes = l.notes.map((s, i) => (i === selected ? new Set<number>() : s));
      return { ...l, notes, mistakes: wasWrong ? l.mistakes + 1 : l.mistakes };
    });
    setCell(selected, next);
  }

  function handleErase() {
    if (myTurnOver || selected === null || !local || givens?.[selected] !== null) return;
    setLocal((l) => (l ? { ...l, notes: l.notes.map((s, i) => (i === selected ? new Set<number>() : s)) } : l));
    setCell(selected, null);
  }

  function handleHint() {
    if (myTurnOver || selected === null || !local || !values || !solution || (local.hintsLeft ?? 0) <= 0) return;
    if (givens?.[selected] !== null || values[selected] === solution[selected]) return;
    setLocal((l) =>
      l
        ? { ...l, notes: l.notes.map((s, i) => (i === selected ? new Set<number>() : s)), hintsLeft: l.hintsLeft - 1 }
        : l,
    );
    setCell(selected, solution[selected]);
  }

  if (net.phase === "connecting") return <p className="status-banner">{t("online.connecting")}</p>;

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
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
      </div>
    );
  }

  function restart() {
    net.restart();
  }

  let status: string;
  if (mode === "race" && net.sudokuWinner) {
    status = t("game.win", { player: net.sudokuWinner === net.mySlot ? t("game.you") : t("online.opponent") });
  } else if (isCoop && solved) {
    status = t("sudoku.coopSolved");
  } else if (mode === "race" && solved) {
    status = t("sudoku.finishedWaiting");
  } else if (lost) {
    status = t("sudoku.lost");
  } else if (!values || !givens) {
    status = t("sudoku.waitingPuzzle");
  } else if (mistakeLimit !== null) {
    status = t("sudoku.mistakes", { count: local?.mistakes ?? 0, limit: mistakeLimit });
  } else if (showErrors) {
    status = t("sudoku.mistakesUnlimited", { count: local?.mistakes ?? 0 });
  } else {
    status = t("sudoku.playing");
  }

  return (
    <div className="game-screen">
      <div className="game-toolbar">
        <button className="secondary-button" onClick={onLeave}>
          {t("game.back")}
        </button>
        <button className="secondary-button" onClick={restart}>
          {t("game.restart")}
        </button>
      </div>

      <p className={`status-banner ${solved ? "win" : ""}`}>{status}</p>

      {values && givens ? (
        <SudokuBoard
          givens={givens}
          values={values}
          notes={local?.notes ?? Array.from({ length: 81 }, () => new Set<number>())}
          conflicts={conflicts}
          selected={selected}
          onSelect={handleSelect}
        />
      ) : null}

      {values && givens && (
        <div className="sudoku-controls">
          <div className="sudoku-numpad">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
              <button key={digit} className="sudoku-digit" onClick={() => handleDigit(digit)} disabled={myTurnOver}>
                {digit}
              </button>
            ))}
          </div>
          <div className="sudoku-actions">
            <button className={`secondary-button ${notesMode ? "active" : ""}`} onClick={() => setNotesMode((n) => !n)}>
              ✏️ {t("sudoku.notes")}
            </button>
            <button className="secondary-button" onClick={handleErase} disabled={myTurnOver}>
              {t("sudoku.erase")}
            </button>
            {hintsEnabled && gameOptions.sudokuHintBudget > 0 && (
              <button className="secondary-button" onClick={handleHint} disabled={myTurnOver || (local?.hintsLeft ?? 0) <= 0}>
                💡 {t("sudoku.hint")} ({local?.hintsLeft ?? 0})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
