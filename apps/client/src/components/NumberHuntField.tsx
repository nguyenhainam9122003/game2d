import { numberHuntCanvasScale, type NumberHuntTarget } from "@game/engine";
import { ZoomPanField } from "./ZoomPanField";

const FIELD_BASE_PX = 480;
const VIEWPORT_PX = 340;

interface Props {
  targets: NumberHuntTarget[];
  found: Set<number>;
  onTap(target: NumberHuntTarget): void;
  /** Force every not-yet-found button disabled too — e.g. once a race has a winner. */
  disabled?: boolean;
}

/**
 * Shared by the solo and vs-bot Tìm số screens. Below `numberHuntCanvasScale`'s threshold
 * (small/default sheets) this renders exactly like before — a plain fixed-size field, no zoom
 * wrapper, zero behavior change. Past it (large "Cỡ tờ số": 200/500/1000) the sheet grows larger
 * than one screen and gets wrapped in `ZoomPanField` so it's still reachable.
 */
export function NumberHuntField({ targets, found, onTap, disabled = false }: Props) {
  const scale = numberHuntCanvasScale(targets.length);
  const fieldPx = FIELD_BASE_PX * scale;

  const field = (
    <div className="nh-field" style={scale > 1 ? { width: fieldPx, height: fieldPx, maxWidth: fieldPx } : undefined}>
      {targets.map((target) => {
        const isFound = found.has(target.value);
        return (
          <button
            key={target.value}
            className={["nh-target", isFound ? "found" : ""].filter(Boolean).join(" ")}
            style={{ left: `${target.x / scale}%`, top: `${target.y / scale}%` }}
            disabled={isFound || disabled}
            onClick={() => onTap(target)}
          >
            {target.value}
          </button>
        );
      })}
    </div>
  );

  if (scale <= 1) return field;
  return (
    <ZoomPanField contentSize={fieldPx} viewportSize={VIEWPORT_PX}>
      {field}
    </ZoomPanField>
  );
}
