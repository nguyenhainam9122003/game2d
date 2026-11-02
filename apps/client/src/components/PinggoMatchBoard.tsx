import { useRef } from "react";

interface Props {
  card: number[];
  /** Provided once the calling phase has started — highlights which of this card's numbers
   *  have already been called. Omitted during arranging (nothing is "called" yet). */
  calledSet?: ReadonlySet<number>;
  /** Arranging mode only — the first of a pending tap-to-swap pair. */
  selected?: number | null;
  winLine?: number[] | null;
  /** Provided only in arranging mode (tap two cells to swap their numbers); omitted once the
   *  calling phase starts, since a card never changes after that. */
  onCellClick?(index: number): void;
  /** Arranging mode only — dragging one cell onto another swaps their numbers directly, an
   *  alternative to the tap-tap-swap `onCellClick` flow above for mouse/desktop use. */
  onSwap?(from: number, to: number): void;
}

export function PinggoMatchBoard({ card, calledSet, selected, winLine, onCellClick, onSwap }: Props) {
  const winSet = winLine ? new Set(winLine) : null;
  const draggable = !!onSwap;

  // Native HTML5 drag-and-drop (onDragStart/onDragOver/onDrop below) only fires for a mouse —
  // most phones never trigger `dragstart` on a touch. These pointer handlers are a touch-drag
  // fallback: track movement since pointerdown, and on release swap into whatever cell is under
  // the finger. A native mouse drag never reaches pointerup (the browser takes over and fires
  // dragend instead), so this never double-swaps alongside the handlers below.
  const dragRef = useRef<{ index: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  function handlePointerDown(index: number) {
    if (draggable) dragRef.current = { index, moved: false };
  }

  function handlePointerMove() {
    if (dragRef.current) dragRef.current.moved = true;
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest(
      "[data-pinggo-index]",
    );
    const to = target ? Number(target.getAttribute("data-pinggo-index")) : NaN;
    if (!Number.isNaN(to) && to !== drag.index) {
      // A click only follows pointerup when the browser treats the gesture as a tap, not a
      // drag — so this flag self-clears on the next tick instead of waiting for a click that,
      // after a real drag, normally never comes (it would otherwise eat the player's next tap).
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      onSwap?.(drag.index, to);
    }
  }

  function handleClick(i: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onCellClick?.(i);
  }

  return (
    <div className="pinggo-match-board">
      {card.map((value, i) => (
        <button
          key={i}
          data-pinggo-index={i}
          className={[
            "pinggo-match-cell",
            selected === i ? "selected" : "",
            calledSet?.has(value) ? "called" : "",
            winSet?.has(i) ? "win-line" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={!onCellClick}
          draggable={draggable}
          style={draggable ? { touchAction: "none" } : undefined}
          onClick={() => handleClick(i)}
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => draggable && e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isNaN(from) && from !== i) onSwap?.(from, i);
          }}
          onPointerDown={() => handlePointerDown(i)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
