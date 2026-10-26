import { useRef, useState } from "react";

interface Props {
  /** Side length (px) of the square content being viewed — bigger than `viewportSize` for
   *  large Tìm số sheets, which is exactly when zoom/pan is worth having. */
  contentSize: number;
  viewportSize: number;
  minZoom?: number;
  maxZoom?: number;
  children: React.ReactNode;
}

/**
 * Pinch-to-zoom + drag-to-pan + mouse-wheel-zoom viewport, for Tìm số's large sheets ("chụm 2
 * ngón phóng to, kéo xem chỗ khác" on rachoi.app). Pointer Events cover touch and mouse in one
 * code path. Double-click/double-tap resets to the fit-to-view zoom.
 */
export function ZoomPanField({ contentSize, viewportSize, minZoom = 0.5, maxZoom = 3, children }: Props) {
  const fitZoom = Math.min(1, viewportSize / contentSize);
  const [zoom, setZoom] = useState(fitZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function clampZoom(z: number) {
    return Math.min(maxZoom, Math.max(minZoom, z));
  }

  function onPointerDown(e: React.PointerEvent) {
    // Browsers reject capturing a pointer id they don't currently recognize as active — harmless
    // to skip (we track positions in `pointers` regardless), but must not abort the rest of this
    // handler, which is what actually matters.
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStartDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartZoom.current = zoom;
      dragStart.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStartDist.current > 0) {
        setZoom(clampZoom(pinchStartZoom.current * (dist / pinchStartDist.current)));
      }
    } else if (pointers.current.size === 1 && dragStart.current) {
      setPan({
        x: dragStart.current.panX + (e.clientX - dragStart.current.x),
        y: dragStart.current.panY + (e.clientY - dragStart.current.y),
      });
    }
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = Array.from(pointers.current.values());
      dragStart.current = { x: p.x, y: p.y, panX: pan.x, panY: pan.y };
    } else {
      dragStart.current = null;
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => clampZoom(z * (1 - e.deltaY * 0.001)));
  }

  function resetView() {
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div
      className="zoom-pan-viewport"
      style={{ width: viewportSize, height: viewportSize }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onDoubleClick={resetView}
    >
      <div
        className="zoom-pan-content"
        style={{
          width: contentSize,
          height: contentSize,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
