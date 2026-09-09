import { Grid } from "@mui/material";
import { useState } from "react";
import { QmkKeycode } from "../keycodes/keycodeConverter";
import { KEY_GAP, KeymapKeyProperties, WIDTH_1U } from "./keymapTypes";

export function KeyLegend(props: { keycode: QmkKeycode }) {
  const { keycode } = props;
  if (!keycode.modLabel && !keycode.holdLabel) {
    return (
      <div className={`key-legend-centered ${keycode.label === "▽" ? "key-legend-symbol" : ""}`}>
        {keycode.label}
      </div>
    );
  }

  return (
    <Grid container direction="column" className="legend-container">
      <Grid item xs={3.5}>
        <div className="mod-legend">{keycode.modLabel ?? ""}</div>
      </Grid>
      <Grid item xs={5}>
        <div className="main-legend">{keycode.label}</div>
      </Grid>
      <Grid item xs={3.5}>
        <div className="hold-legend">{keycode.holdLabel ?? ""}</div>
      </Grid>
    </Grid>
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

export function KeymapKey(props: KeymapKeyProperties & { isFocused?: boolean }) {
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
      <KeyLegend keycode={props.keycode} />
    </div>
  );
}
