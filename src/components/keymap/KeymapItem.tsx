import { useState } from "react";
import { QmkKeycode } from "../keycodes/keycodeConverter";
import { KEY_GAP, KeymapKeyProperties, WIDTH_1U } from "./keymapTypes";

/**
 * Second line of a stacked legend (LT / modifier keys): the tap key or the base keycode of a
 * modifier key. It becomes a button when the line can be selected on its own (props.onTapClick),
 * so a click picks only that half of the key instead of the whole keycode.
 */
function LegendLine(props: {
  content: string;
  ariaLabel: string;
  title: string;
  isFocused?: boolean;
  onTapClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}) {
  if (!props.onTapClick) {
    return <div className="layer-tap-tap main-legend">{props.content}</div>;
  }

  return (
    <button
      type="button"
      className="layer-tap-tap main-legend"
      aria-label={props.ariaLabel}
      aria-pressed={props.isFocused ?? false}
      title={props.title}
      onClick={(event) => {
        event.stopPropagation();
        props.onTapClick?.(event.currentTarget, event.ctrlKey);
      }}
    >
      {props.content}
    </button>
  );
}

export function KeyLegend(props: {
  keycode: QmkKeycode;
  isTapFocused?: boolean;
  onTapClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}) {
  const { keycode } = props;
  if (keycode.key.startsWith("LT(") && keycode.hold !== undefined) {
    return (
      <div className="layer-tap-legend">
        <div className="layer-tap-hold hold-legend">LT {keycode.hold & 0xf}</div>
        <LegendLine
          content={keycode.tap === 0 ? "" : keycode.label}
          ariaLabel={`LT ${keycode.hold & 0xf} tap key`}
          title="Tap key (basic keycodes only)"
          isFocused={props.isTapFocused}
          onTapClick={props.onTapClick}
        />
      </div>
    );
  }

  // Modifier / hold keys (LCTL(kc), LSft(kc), MT(...), ...) use the same two-line layout as the
  // LT legend above: the modifier on the first line and the base keycode on the second one.
  // Like the LT tap key, that second line can be selected on its own to pick the base keycode,
  // which lets a modifier stay attached to whatever key is chosen afterwards.
  const holdLegend = keycode.modNameLabel ?? keycode.modLabel ?? keycode.holdLabel;
  if (holdLegend) {
    return (
      <div className="layer-tap-legend">
        <div className="layer-tap-hold hold-legend">{holdLegend}</div>
        <LegendLine
          content={keycode.label}
          ariaLabel={`${holdLegend} base key`}
          title="Base keycode (basic keycodes only)"
          isFocused={props.isTapFocused}
          onTapClick={props.onTapClick}
        />
      </div>
    );
  }

  return (
    <div className={`key-legend-centered ${keycode.label === "▽" ? "key-legend-symbol" : ""}`}>
      {keycode.label}
    </div>
  );
}

export function EditableKey(props: {
  keycode: QmkKeycode;
  isFocused?: boolean;
  onKeycodeChange?: (newKeycode: QmkKeycode) => void;
  onClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      className={`keymap-key ${isDragOver && "drag-over"} ${props.isFocused && "keymap-key-focused"}`}
      style={{
        width: WIDTH_1U,
        height: WIDTH_1U,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget, event.ctrlKey)}
    >
      <KeyLegend keycode={props.keycode} />
    </div>
  );
}

export function KeymapKey(props: KeymapKeyProperties & {
  isFocused?: boolean;
  isTapFocused?: boolean;
  onTapClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      key={props.reactKey}
      className={`keymap-key ${props.isEncoder && "keymap-encoder"} ${isDragOver && "drag-over"} ${props.isFocused && "keymap-key-focused"}`}
      style={
        props.r != 0
          ? {
              position: "absolute",
              top: (props.ry + props.offsety) * (WIDTH_1U + KEY_GAP),
              left: (props.rx + props.offsetx) * (WIDTH_1U + KEY_GAP),
              width: props.w * WIDTH_1U - 4 + (props.w - 1) * KEY_GAP,
              height: props.h * WIDTH_1U - 4,
              transform: "var(--keymap-rotation)",
              "--keymap-rotation": `rotate(${props.r}deg)`,
              animationDelay:
                props.animationDelay !== undefined
                  ? `${props.animationDelay}ms`
                  : undefined,
              transformOrigin: `${-props.offsetx * (WIDTH_1U + KEY_GAP)}px ${-props.offsety * (WIDTH_1U + KEY_GAP)}px`,
            } as React.CSSProperties
          : {
              position: "absolute",
              top: props.y * (WIDTH_1U + KEY_GAP),
              left: props.x * (WIDTH_1U + KEY_GAP),
              width: props.w * WIDTH_1U - 4 + (props.w - 1) * KEY_GAP,
              height: props.h * WIDTH_1U - 4,
              transform: "var(--keymap-rotation)",
              "--keymap-rotation": "rotate(0deg)",
              animationDelay:
                props.animationDelay !== undefined
                  ? `${props.animationDelay}ms`
                  : undefined,
            } as React.CSSProperties
      }
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(props, keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget, event.ctrlKey)}
      title={props.shortcut}
    >
      <KeyLegend
        keycode={props.keycode}
        isTapFocused={props.isTapFocused}
        onTapClick={props.onTapClick}
      />
    </div>
  );
}
