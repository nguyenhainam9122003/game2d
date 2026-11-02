import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  generatePinggoMatchCard,
  shufflePinggoMatchCard,
  findPinggoMatchCompletedLines,
  PINGGO_MATCH_LINES_TO_WIN,
  getPinggoBotCall,
  PINGGO_CALL_INTERVAL_MS,
} from "@game/engine";
import { useAppStore } from "../store";
import { useStatsStore } from "../statsStore";
import { PinggoMatchBoard } from "../components/PinggoMatchBoard";
import { PauseMenu } from "../components/PauseMenu";

type Phase = "arranging" | "calling";
type Turn = 1 | 2;

/**
 * Pinggo "Chơi với máy" / "2 người chung máy" — both players arrange their own 25 numbers onto
 * their own 5x5 card, then take turns calling out a number; both cards are checked for a
 * completed line after every call. "2 người" passes the device between turns (same gate
 * Battleship uses for ship placement); vs-bot skips that entirely — the bot's card is shuffled
 * silently and it never needs its own screen.
 */
export function PinggoMatchGame() {
  const { t } = useTranslation();
  const { mode, difficulty, goToGameDetail } = useAppStore();
  const isVsBot = mode === "vs-bot";

  const [cards, setCards] = useState<[number[], number[]]>(() => [
    generatePinggoMatchCard(),
    isVsBot ? shufflePinggoMatchCard(generatePinggoMatchCard()) : generatePinggoMatchCard(),
  ]);
  const [phase, setPhase] = useState<Phase>("arranging");
  const [turn, setTurn] = useState<Turn>(1);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [called, setCalled] = useState<number[]>([]);
  const [paused, setPaused] = useState(false);
  const statsRecordedRef = useRef(false);

  const calledSet = new Set(called);
  const completedLines: [number[][], number[][]] = [
    findPinggoMatchCompletedLines(cards[0], calledSet),
    findPinggoMatchCompletedLines(cards[1], calledSet),
  ];
  const winner: Turn | null =
    completedLines[0].length >= PINGGO_MATCH_LINES_TO_WIN
      ? 1
      : completedLines[1].length >= PINGGO_MATCH_LINES_TO_WIN
        ? 2
        : null;
  const gameOver = winner !== null;
  const isBotTurn = isVsBot && phase === "calling" && turn === 2 && !gameOver;

  useEffect(() => {
    if (!gameOver) {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [gameOver]);

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = setTimeout(() => {
      handleCall(getPinggoBotCall(cards[1], calledSet, difficulty));
    }, PINGGO_CALL_INTERVAL_MS[difficulty]);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, called, difficulty]);

  function playerLabel(player: Turn): string {
    if (isVsBot) return player === 1 ? t("game.you") : t("game.bot");
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function freshRound() {
    setCards([
      generatePinggoMatchCard(),
      isVsBot ? shufflePinggoMatchCard(generatePinggoMatchCard()) : generatePinggoMatchCard(),
    ]);
    setPhase("arranging");
    setTurn(1);
    setRevealed(false);
    setSelected(null);
    setCalled([]);
  }

  function restart() {
    freshRound();
  }

  function swapCells(a: number, b: number) {
    setCards((prev) => {
      const next: [number[], number[]] = [[...prev[0]], [...prev[1]]];
      const card = next[turn - 1];
      [card[a], card[b]] = [card[b], card[a]];
      return next;
    });
  }

  function handleSwapClick(index: number) {
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    swapCells(selected, index);
    setSelected(null);
  }

  function handleDragSwap(from: number, to: number) {
    swapCells(from, to);
    setSelected(null); // cancel any pending tap-selection so it doesn't linger highlighted
  }

  function handleShuffle() {
    setCards((prev) => {
      const next: [number[], number[]] = [[...prev[0]], [...prev[1]]];
      next[turn - 1] = shufflePinggoMatchCard(next[turn - 1]);
      return next;
    });
    setSelected(null);
  }

  function handleArrangeReady() {
    setSelected(null);
    if (isVsBot) {
      setPhase("calling"); // the bot's card was already shuffled silently at init — no 2nd turn
      setTurn(1);
      return;
    }
    if (turn === 1) {
      setTurn(2);
      setRevealed(false);
    } else {
      setPhase("calling");
      setTurn(1);
      setRevealed(false);
    }
  }

  function handleCall(number: number) {
    if (phase !== "calling" || gameOver || calledSet.has(number)) return;
    const nextCalledSet = new Set(calledSet).add(number);
    const justWon =
      findPinggoMatchCompletedLines(cards[0], nextCalledSet).length >= PINGGO_MATCH_LINES_TO_WIN ||
      findPinggoMatchCompletedLines(cards[1], nextCalledSet).length >= PINGGO_MATCH_LINES_TO_WIN;
    setCalled((c) => [...c, number]);
    if (!justWon) {
      setTurn((p) => (p === 1 ? 2 : 1));
      setRevealed(false);
    }
  }

  const toolbar = (
    <div className="game-toolbar">
      <button className="secondary-button" onClick={goToGameDetail}>
        {t("game.back")}
      </button>
      <button className="secondary-button" onClick={restart}>
        {t("game.restart")}
      </button>
      {!gameOver && (
        <button className="secondary-button" onClick={() => setPaused(true)}>
          ⏸ {t("game.pause")}
        </button>
      )}
    </div>
  );

  if (gameOver) {
    return (
      <div className="game-screen">
        {toolbar}
        <p className="status-banner win">{t("game.win", { player: playerLabel(winner) })}</p>
        <p className="section-title">{playerLabel(1)}</p>
        <PinggoMatchBoard
          card={cards[0]}
          calledSet={calledSet}
          winLine={winner === 1 ? completedLines[0].flat() : null}
        />
        <p className="section-title">{playerLabel(2)}</p>
        <PinggoMatchBoard
          card={cards[1]}
          calledSet={calledSet}
          winLine={winner === 2 ? completedLines[1].flat() : null}
        />
        {paused && <PauseMenu gameId="pinggo" onResume={() => setPaused(false)} onRestart={restart} />}
      </div>
    );
  }

  if (!isVsBot && !revealed) {
    return (
      <div className="game-screen">
        {toolbar}
        <div className="bs-pass-gate">
          <p className="status-banner">
            {phase === "arranging" ? t("pinggo.arrangeTurn", { player: playerLabel(turn) }) : t("game.turnOf", { player: playerLabel(turn) })}
          </p>
          <button className="primary-button" onClick={() => setRevealed(true)}>
            {t("pinggo.ready")}
          </button>
        </div>
        {paused && <PauseMenu gameId="pinggo" onResume={() => setPaused(false)} onRestart={restart} />}
      </div>
    );
  }

  if (phase === "arranging") {
    return (
      <div className="game-screen">
        {toolbar}
        <p className="status-banner">{t("pinggo.arrangeTurn", { player: playerLabel(turn) })}</p>
        <p className="po-hint">{t("pinggo.arrangeHint")}</p>
        <PinggoMatchBoard
          card={cards[turn - 1]}
          selected={selected}
          onCellClick={handleSwapClick}
          onSwap={handleDragSwap}
        />
        <div className="game-toolbar">
          <button className="secondary-button" onClick={handleShuffle}>
            🔀 {t("pinggo.shuffle")}
          </button>
          <button className="primary-button" onClick={handleArrangeReady}>
            {t("pinggo.ready")}
          </button>
        </div>
        {paused && <PauseMenu gameId="pinggo" onResume={() => setPaused(false)} onRestart={restart} />}
      </div>
    );
  }

  const status = isBotTurn ? t("game.thinking", { player: playerLabel(2) }) : t("pinggo.callTurn", { player: playerLabel(turn) });
  const displayedIndex = isVsBot ? 0 : turn - 1;
  const displayedCard = cards[displayedIndex];
  const displayedLines = completedLines[displayedIndex];

  return (
    <div className="game-screen">
      {toolbar}
      <p className="status-banner">{status}</p>
      <p className="po-hint">{t("pinggo.linesProgress", { count: displayedLines.length, total: PINGGO_MATCH_LINES_TO_WIN })}</p>

      <PinggoMatchBoard card={displayedCard} calledSet={calledSet} winLine={displayedLines.flat()} />

      {called.length > 0 && (
        <div className="pinggo-history">
          {called.map((n) => (
            <span key={n} className="pinggo-history-chip">
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="pinggo-call-picker">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className="pinggo-call-number"
            disabled={calledSet.has(n) || isBotTurn}
            onClick={() => handleCall(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {paused && <PauseMenu gameId="pinggo" onResume={() => setPaused(false)} onRestart={restart} />}
    </div>
  );
}
