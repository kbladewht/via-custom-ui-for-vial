import { Box } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { playKeycapLandingSound } from "../keycapAudio";
import { convertToKeymapKeys, normalizeKeymapKeys } from "./keymapLogic";
import { KeySettingHint } from "../KeySettingHint";
import { KeySettingHintAreaContext, useKeySettingHint } from "../useKeySettingHint";
import { KeymapKey } from "./KeymapItem";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  QmkKeycode,
} from "../keycodes/keycodeConverter";
import {
  FocusedKeyContext,
  KeymapKeyProperties,
  KeymapProperties,
} from "./keymapTypes";

export function KeymapLayer(props: {
  keymapReady: boolean;
  keymapProps: KeymapProperties;
  layoutOption: { [layout: number]: number };
  keymap: number[];
  encodermap: number[][];
  keycodeconverter: KeycodeConverter;
  shortcutByKeycode: { [keycode: number]: string };
  onKeycodeChange?: (target: KeymapKeyProperties, newKeycode: QmkKeycode) => void;
}) {
  const { hintTarget, hintClick, closeHint, hintAreaId } = useKeySettingHint();
  const boundaryEl = useRef<HTMLElement>(null);
  const [focusedKey, setFocusedKey] = useState<KeymapKeyProperties | undefined>(undefined);
  const [isTapFocused, setIsTapFocused] = useState(false);
  const keycapSoundPlayed = useRef(false);
  const { setFocusedKey: setContextFocusedKey } = useContext(FocusedKeyContext);
  const onKeycodeChangeRef = useRef(props.onKeycodeChange);
  onKeycodeChangeRef.current = props.onKeycodeChange;

  const layoutKeys = convertToKeymapKeys(
    props.keymapProps,
    props.layoutOption,
    props.keymap,
    props.encodermap,
    props.keycodeconverter,
    props.shortcutByKeycode,
  );
  const { keys: keymapkeys, width, height } = normalizeKeymapKeys(layoutKeys);

  useEffect(() => {
    if (!props.keymapReady || keycapSoundPlayed.current) return;
    keycapSoundPlayed.current = true;
    const maxX = Math.max(...keymapkeys.map((key) => key.x), 1);
    const delays = [...new Set(
      keymapkeys.map((key) =>
        Math.round(520 + Math.floor((Math.max(0, key.x) / maxX) * 5) * 120),
      ),
    )].sort((a, b) => a - b);
    const timers = delays.map((delay, index) =>
      window.setTimeout(() => playKeycapLandingSound(index), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [props.keymapReady]);

  const keymapkeysRef = useRef(keymapkeys);
  keymapkeysRef.current = keymapkeys;

  const focusNextKeyAfter = (current: KeymapKeyProperties) => {
    const nextIdx = parseInt(current.reactKey, 10) + 1;
    const next = keymapkeysRef.current[nextIdx];
    if (next) {
      setFocusedKey({ ...next, reactKey: nextIdx.toString() });
    } else {
      setFocusedKey(undefined);
    }
  };

  useEffect(() => {
    if (focusedKey) {
      setContextFocusedKey({
        ...focusedKey,
        onKeycodeChange: (target, newKeycode) => {
          if (isTapFocused) {
            // The second legend line only carries the base keycode, so keep the hold (layer) and
            // the modifier bits of the key: LCTL(kc) / MT(...) / LT(...) stay intact and only the
            // base keycode is replaced by the picked one.
            const combined = props.keycodeconverter.combineBaseKeycode(focusedKey.keycode, newKeycode);
            if (!combined) return;
            onKeycodeChangeRef.current?.(target, combined);
            setFocusedKey({ ...focusedKey, keycode: combined });
            return;
          }
          onKeycodeChangeRef.current?.(target, newKeycode);
          focusNextKeyAfter(target);
        },
      });
    } else {
      setContextFocusedKey(null);
    }
  }, [focusedKey, isTapFocused, props.keycodeconverter, setContextFocusedKey]);

  useEffect(() => {
    const clearFocusedKey = () => {
      setFocusedKey(undefined);
      setIsTapFocused(false);
      closeHint();
    };
    window.addEventListener("vial-clear-focused-key", clearFocusedKey);
    return () => window.removeEventListener("vial-clear-focused-key", clearFocusedKey);
  }, [closeHint]);

  const content = (
    <Box ref={boundaryEl}>
      <Box
        className={`keymap-surface ${props.keymapReady ? "keymap-surface-loaded" : ""}`}
        sx={{
          position: "relative",
          mt: 1,
          height: `${Math.ceil(height) + 8}px`,
          width: `${Math.ceil(width) + 8}px`,
          minWidth: "100%",
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          closeHint();
          setFocusedKey(undefined);
        }}
      >
        {keymapkeys.map((p, idx) => (
          <KeymapKey
            key={idx}
            {...p}
            isFocused={focusedKey?.reactKey === idx.toString()}
            isTapFocused={isTapFocused && focusedKey?.reactKey === idx.toString()}
            onTapClick={(target, ctrlKey) => {
              setIsTapFocused(true);
              setFocusedKey({ ...p, reactKey: idx.toString() });
              if (ctrlKey) hintClick(p.keycode, target);
            }}
            onKeycodeChange={props.onKeycodeChange}
            animationDelay={Math.min(1000, Math.pow(Math.max(0, p.x), 1.35) * 27)}
            onClick={(target, ctrlKey) => {
              setIsTapFocused(false);
              if (!isTapFocused && focusedKey?.reactKey === idx.toString()) {
                closeHint();
                setFocusedKey(undefined);
                return;
              }

              setFocusedKey({ ...p, reactKey: idx.toString() });
              if (ctrlKey) hintClick(p.keycode, target);
            }}
            reactKey={idx.toString()}
          />
        ))}
      </Box>
      <KeySettingHint
        type="keymap"
        open={hintTarget !== null}
        keycode={hintTarget?.keycode ?? DefaultQmkKeycode}
        keycodeconverter={props.keycodeconverter}
        anchor={hintTarget?.anchor}
        boundary={boundaryEl.current}
        onClose={closeHint}
      />
    </Box>
  );
  return (
    <KeySettingHintAreaContext.Provider value={hintAreaId}>{content}</KeySettingHintAreaContext.Provider>
  );
}
