import { Box } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import { playKeycapLandingSound } from "../keycapAudio";
import { convertToKeymapKeys } from "./keymapLogic";
import { KeymapKeyPopUp } from "../KeymapKeyPopUp";
import { KeymapKey } from "./KeymapItem";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  QmkKeycode,
} from "../keycodes/keycodeConverter";
import {
  FocusedKeyContext,
  KEY_GAP,
  KeymapKeyProperties,
  KeymapProperties,
  WIDTH_1U,
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
  const [popupOpen, setpopupOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | undefined>(undefined);
  const boundaryEl = useRef<HTMLElement>(null);
  const [focusedKey, setFocusedKey] = useState<KeymapKeyProperties | undefined>(undefined);
  const [candidateKeycode, setCandidateKeycode] = useState<QmkKeycode>(DefaultQmkKeycode);
  const keycapSoundPlayed = useRef(false);
  const focusContext = useContext(FocusedKeyContext);

  const keymapkeys = convertToKeymapKeys(
    props.keymapProps,
    props.layoutOption,
    props.keymap,
    props.encodermap,
    props.keycodeconverter,
    props.shortcutByKeycode,
  );

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

  const rightmostPos =
    Math.max(...keymapkeys.map((key) => key.x + key.w)) * (WIDTH_1U + KEY_GAP) + WIDTH_1U;

  const focusNextKeyAfter = (current: KeymapKeyProperties) => {
    const nextIdx = parseInt(current.reactKey, 10) + 1;
    const next = keymapkeysRef.current[nextIdx];
    if (next) {
      setFocusedKey({ ...next, reactKey: nextIdx.toString() });
      setCandidateKeycode(next.keycode);
    } else {
      setFocusedKey(undefined);
    }
  };

  useEffect(() => {
    if (focusedKey) {
      focusContext.setFocusedKey({
        ...focusedKey,
        onKeycodeChange: (target, newKeycode) => {
          props.onKeycodeChange?.(target, newKeycode);
          focusNextKeyAfter(target);
        },
      });
    } else {
      focusContext.setFocusedKey(null);
    }
  }, [focusedKey, props.onKeycodeChange, focusContext]);

  useEffect(() => {
    const clearFocusedKey = () => {
      setFocusedKey(undefined);
      setpopupOpen(false);
      setAnchorEl(undefined);
    };
    window.addEventListener("vial-clear-focused-key", clearFocusedKey);
    return () => window.removeEventListener("vial-clear-focused-key", clearFocusedKey);
  }, []);

  return (
    <Box ref={boundaryEl}>
      <Box
        className={`keymap-surface ${props.keymapReady ? "keymap-surface-loaded" : ""}`}
        sx={{
          position: "relative",
          mt: 1,
          height: `${(Math.max(...keymapkeys.map((k) => k.y)) + 1) * (WIDTH_1U + KEY_GAP)}px`,
          width: `${rightmostPos}px`,
          minWidth: "100%",
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          setpopupOpen(false);
          setAnchorEl(undefined);
          setFocusedKey(undefined);
        }}
      >
        {keymapkeys.map((p, idx) => (
          <KeymapKey
            key={idx}
            {...p}
            isFocused={focusedKey?.reactKey === idx.toString()}
            onKeycodeChange={props.onKeycodeChange}
            animationDelay={Math.min(1000, Math.pow(Math.max(0, p.x), 1.35) * 27)}
            onClick={(target, ctrlKey) => {
              if (focusedKey?.reactKey === idx.toString()) {
                setpopupOpen(false);
                setAnchorEl(undefined);
                setFocusedKey(undefined);
                return;
              }

              setCandidateKeycode(p.keycode);
              setFocusedKey({ ...p, reactKey: idx.toString() });
              setAnchorEl(target);
              if (ctrlKey) {
                setpopupOpen(true);
              }
            }}
            reactKey={idx.toString()}
          />
        ))}
      </Box>
      <KeymapKeyPopUp
        open={popupOpen}
        keycodeconverter={props.keycodeconverter}
        keycode={focusedKey?.keycode ?? DefaultQmkKeycode}
        anchor={anchorEl}
        boundary={boundaryEl.current}
        keymapKey={focusedKey}
        onClickAway={() => {
          if (popupOpen) {
            setpopupOpen(false);
            setAnchorEl(undefined);
            setFocusedKey(undefined);
            if (focusedKey) {
              props.onKeycodeChange?.(focusedKey!, candidateKeycode);
            }
          }
        }}
        onChange={(event) => {
          setCandidateKeycode(event.keycode);
        }}
      ></KeymapKeyPopUp>
    </Box>
  );
}
