import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { generatePinggoMatchCard, findPinggoMatchWinLine } from "@game/engine";
import { useAppStore } from "../store";
import { useStatsStore } from "../statsStore";
import { PinggoMatchBoard } from "../components/PinggoMatchBoard";
import { PauseMenu } from "../components/PauseMenu";

type Phase = "arranging" | "calling";
type Turn = 1 | 2;

/**
 * "2 người" Pinggo — pass-the-device local play. Each player privately arranges their own
 * numbers onto their own card (same gate Battleship uses for ship placement), then the two take
 * turns calling out a number; both cards are checked for a completed line after every call.
 */
export function PinggoMatchGame() {
  const { t } = useTranslation();
  const { goToGameDetail } = useAppStore();

  const [cards, setCards] = useState<[number[], number[]]>(() => [
    generatePinggoMatchCard(),
    generatePinggoMatchCard(),
  ]);
  const [phase, setPhase] = useState<Phase>("arranging");
  const [turn, setTurn] = useState<Turn>(1);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [called, setCalled] = useState<number[]>([]);
  const [winner, setWinner] = useState<Turn | null>(null);
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [paused, setPaused] = useState(false);
  const statsRecordedRef = useRef(false);

  const calledSet = new Set(called);
  const gameOver = winner !== null;

  useEffect(() => {
    if (!gameOver) {
      statsRecordedRef.current = false;
      return;
    }
    if (statsRecordedRef.current) return;
    statsRecordedRef.current = true;
    useStatsStore.getState().incrementGamesPlayed();
  }, [gameOver]);

  function playerLabel(player: Turn): string {
    return player === 1 ? t("game.player1") : t("game.player2");
  }

  function freshRound() {
    setCards([generatePinggoMatchCard(), generatePinggoMatchCard()]);
    setPhase("arranging");
    setTurn(1);
    setRevealed(false);
    setSelected(null);
    setCalled([]);
    setWinner(null);
    setWinLine(null);
  }

  function restart() {
    freshRound();
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
    setCards((prev) => {
      const next: [number[], number[]] = [[...prev[0]], [...prev[1]]];
      const card = next[turn - 1];
      [card[selected], card[index]] = [card[index], card[selected]];
      return next;
    });
    setSelected(null);
  }

  function handleShuffle() {
    setCards((prev) => {
      const next: [number[], number[]] = [[...prev[0]], [...prev[1]]];
      next[turn - 1] = generatePinggoMatchCard();
      return next;
    });
    setSelected(null);
  }

  function handleArrangeReady() {
    setSelected(null);
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
    const nextCalled = [...called, number];
    setCalled(nextCalled);
    const nextCalledSet = new Set(nextCalled);
    const line1 = findPinggoMatchWinLine(cards[0], nextCalledSet);
    const line2 = findPinggoMatchWinLine(cards[1], nextCalledSet);
    if (line1) {
      setWinner(1);
      setWinLine(line1);
      return;
    }
    if (line2) {
      setWinner(2);
      setWinLine(line2);
      return;
    }
    setTurn((p) => (p === 1 ? 2 : 1));
    setRevealed(false);
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
          winLine={winner === 1 ? winLine : null}
        />
        <p className="section-title">{playerLabel(2)}</p>
        <PinggoMatchBoard
          card={cards[1]}
          calledSet={calledSet}
          winLine={winner === 2 ? winLine : null}
        />
      </div>
    );
  }

  if (!revealed) {
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

  return (
    <div className="game-screen">
      {toolbar}
      <p className="status-banner">{t("pinggo.callTurn", { player: playerLabel(turn) })}</p>

      <PinggoMatchBoard card={cards[turn - 1]} calledSet={calledSet} />

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
            disabled={calledSet.has(n)}
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
