import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { computeOAnQuanSowPath, type OAnQuanState } from "@game/engine";
import { OAQ_HOP_MS } from "../oAnQuanAnim";

interface Props {
  state: OAnQuanState;
  selectablePits: readonly number[];
  onPitClick(index: number): void;
  /** Pit the last move sowed from; replays the real sowing path from it so the
   * board can show a stone actually hopping pit to pit. */
  lastMove?: number | null;
}

const TOP_ROW = [11, 10, 9, 8, 7];
const BOTTOM_ROW = [1, 2, 3, 4, 5];
const HOP_MS = OAQ_HOP_MS;

// Hand-tuned scatter spots (% of the pit) so pebbles read as casually dropped
// stones instead of a grid; counts beyond the list are conveyed by the badge.
const SEED_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [50, 48],
  [31, 34],
  [69, 37],
  [36, 66],
  [66, 64],
  [51, 25],
  [21, 53],
  [79, 55],
  [40, 47],
  [61, 46],
];
const MAX_SEEDS = SEED_SPOTS.length;

/** Each pit's approximate center, as a percentage of the board box, matching
 * the grid this component renders below (7 columns x 2 rows, quan pits in
 * columns 1 and 7 spanning both rows) — lets the traveling stone be
 * positioned with plain CSS instead of measuring real DOM rects. */
const PIT_POSITION: Record<number, { left: number; top: number }> = {
  0: { left: (0.5 / 7) * 100, top: 50 },
  11: { left: (1.5 / 7) * 100, top: 25 },
  10: { left: (2.5 / 7) * 100, top: 25 },
  9: { left: (3.5 / 7) * 100, top: 25 },
  8: { left: (4.5 / 7) * 100, top: 25 },
  7: { left: (5.5 / 7) * 100, top: 25 },
  6: { left: (6.5 / 7) * 100, top: 50 },
  5: { left: (5.5 / 7) * 100, top: 75 },
  4: { left: (4.5 / 7) * 100, top: 75 },
  3: { left: (3.5 / 7) * 100, top: 75 },
  2: { left: (2.5 / 7) * 100, top: 75 },
  1: { left: (1.5 / 7) * 100, top: 75 },
};

export function OAnQuanBoard({ state, selectablePits, onPitClick, lastMove = null }: Props) {
  // Previous pit counts, to tell which pits just gained (bump + seed pop) or
  // were just emptied (capture flash). Updated after paint so the render that
  // changes a count still sees the old values.
  const prevPitsRef = useRef<number[]>(state.pits);
  const prevPits = prevPitsRef.current;

  // The real stone-by-stone sowing path for the move that produced the
  // current `state`, computed from the pit counts as they were just before
  // it (`prevPits`, read before the sync effect below overwrites the ref) —
  // recomputed only when the state actually changes, not on every re-render.
  const path = useMemo(
    () => (lastMove != null ? computeOAnQuanSowPath(prevPits, lastMove) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.pits],
  );

  // Delay (ms) of a pit's LAST stone drop in the path — drives both its own
  // landing bump and, for the traveling dot, which waypoint is "live" when.
  const landingDelay = useMemo(() => {
    const m = new Map<number, number>();
    path.forEach((p, i) => m.set(p, i * HOP_MS));
    return m;
  }, [path]);

  // The traveling stone: steps through `path` on its own clock — starting at
  // `lastMove` itself (hop 0, the pit it was picked up from) and then one
  // waypoint per hop — so it visits every pit in order regardless of React
  // re-renders in between, then briefly fades out once it's done.
  const [hop, setHop] = useState(0);
  const [dotPhase, setDotPhase] = useState<"hidden" | "visible" | "fading">("hidden");
  useEffect(() => {
    if (path.length === 0 || lastMove == null) {
      setDotPhase("hidden");
      return;
    }
    setHop(0);
    setDotPhase("visible");
    let cancelled = false;
    const timers = path.map((_, i) =>
      setTimeout(() => {
        if (!cancelled) setHop(i + 1);
      }, (i + 1) * HOP_MS),
    );
    const fadeTimer = setTimeout(() => {
      if (!cancelled) setDotPhase("fading");
    }, (path.length + 1) * HOP_MS);
    const hideTimer = setTimeout(
      () => {
        if (!cancelled) setDotPhase("hidden");
      },
      (path.length + 1) * HOP_MS + 250,
    );
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, lastMove]);

  useEffect(() => {
    prevPitsRef.current = state.pits;
  });

  function pit(index: number, isQuan: boolean, gridRow: string, gridColumn: string) {
    const count = state.pits[index];
    const before = prevPits[index] ?? count;
    const gained = count > before;
    const emptied = count === 0 && before > 0;
    const waveDelay = landingDelay.get(index) ?? 0;
    const selectable = selectablePits.includes(index) && count > 0;
    const classes = [
      "oaq-pit",
      isQuan ? "oaq-quan" : "oaq-dan",
      index === 0 ? "oaq-quan-left" : "",
      index === 6 ? "oaq-quan-right" : "",
      selectable ? "selectable" : "",
      emptied ? "oaq-flash" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const style = { gridRow, gridColumn, "--oaq-delay": `${waveDelay}ms` } as CSSProperties;
    return (
      <button
        key={index}
        className={classes}
        style={style}
        disabled={!selectable}
        aria-label={String(count)}
        onClick={() => onPitClick(index)}
      >
        {/* Keyed by count so a change remounts the content and replays its
            pop/bump animations; an unchanged pit stays perfectly still. */}
        <span className={`oaq-pit-inner${gained ? " gained" : ""}`} key={count}>
          {isQuan
            ? count > 0 && <span className="oaq-quan-stone">{count}</span>
            : count > 0 && (
                <>
                  <span className="oaq-seeds" aria-hidden="true">
                    {Array.from({ length: Math.min(count, MAX_SEEDS) }, (_, s) => (
                      <i
                        key={s}
                        className="oaq-seed"
                        style={{
                          left: `${SEED_SPOTS[s][0]}%`,
                          top: `${SEED_SPOTS[s][1]}%`,
                          animationDelay: `${waveDelay + s * 25}ms`,
                        }}
                      />
                    ))}
                  </span>
                  <span className="oaq-count">{count}</span>
                </>
              )}
        </span>
      </button>
    );
  }

  const travelingTo = hop === 0 ? lastMove : (path[hop - 1] ?? null);
  const travelPos = dotPhase !== "hidden" && travelingTo != null ? PIT_POSITION[travelingTo] : null;

  return (
    <div className="oaq-board">
      {pit(0, true, "1 / span 2", "1")}
      {TOP_ROW.map((i, col) => pit(i, false, "1", String(col + 2)))}
      {BOTTOM_ROW.map((i, col) => pit(i, false, "2", String(col + 2)))}
      {pit(6, true, "1 / span 2", "7")}
      {travelPos && (
        <span
          className={`oaq-traveler${dotPhase === "fading" ? " fading" : ""}`}
          style={{ left: `${travelPos.left}%`, top: `${travelPos.top}%`, transitionDuration: `${HOP_MS}ms` }}
        />
      )}
    </div>
  );
}
