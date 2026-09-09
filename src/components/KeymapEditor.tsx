import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import "../App.css";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { KeycodeCatalog } from "./KeycodeCatalog";
import {
  discardPendingKeycapAudio,
  playKeycapLandingSound,
  prepareKeycapAudio,
} from "./keycapAudio";
import { KeymapKeyPopUp } from "./KeymapKeyPopUp";
import { KeymapKey, KeyLegend, EditableKey } from "./keymap/KeymapItem";
import { LayerEditor } from "./keymap/LayerEditor";
import {
  FocusedKeyContext,
  KeymapKeyProperties,
  KeymapProperties,
  KEY_GAP,
  WIDTH_1U,
} from "./keymap/keymapTypes";
import { KeycodeConverter } from "./keycodes/keycodeConverter";

export {
  discardPendingKeycapAudio,
  prepareKeycapAudio,
  FocusedKeyContext,
  KEY_GAP,
  WIDTH_1U,
  KeymapKeyPopUp,
  KeymapKey,
  KeyLegend,
  EditableKey,
};
export {
  ComboOverrideEditor,
  TapDanceSelector,
  KeyOverrideSelector,
  AltRepeatKeySelector,
} from "./keymap/FeatureSelectors";
export { LanguageSelector } from "./LanguageSelector";
export type { KeymapKeyProperties, KeymapProperties } from "./keymap/keymapTypes";

export function KeymapEditor(props: {
  keymap: KeymapProperties;
  via: ViaKeyboard;
  language: "zh" | "en";
  onLanguageChange: (language: "zh" | "en") => void;
  keymapLanguage: string;
  dynamicEntryCount: {
    layer: number;
    macro: number;
    tapdance: number;
    combo: number;
    override: number;
  };
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [focusedKey, setFocusedKey] = useState<KeymapKeyProperties | null>(null);

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      props.keymap.customKeycodes,
      props.dynamicEntryCount.macro,
      props.dynamicEntryCount.tapdance,
      props.keymapLanguage,
      "0.0.3",
      props.language,
    ).then((k) => setKeycodeConverter(k));
  }, [props.dynamicEntryCount.layer, props.keymap.customKeycodes, props.dynamicEntryCount, props.keymapLanguage, props.language]);

  useEffect(() => {
    if (!focusedKey) return;

    const clearSelectionOnBlankClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".keymap-key, .keycatalog-key, .keycode-catalog-tab, .key-select-popup, " +
            "button, input, textarea, select, [role='button'], [role='tab'], [role='option']",
        )
      ) {
        return;
      }
      setFocusedKey(null);
      window.dispatchEvent(new CustomEvent("vial-clear-focused-key"));
    };

    document.addEventListener("click", clearSelectionOnBlankClick);
    return () => document.removeEventListener("click", clearSelectionOnBlankClick);
  }, [focusedKey]);

  const candidateAreaWasOpen = useRef(false);
  useEffect(() => {
    const isOpening = !!focusedKey && !candidateAreaWasOpen.current;
    candidateAreaWasOpen.current = !!focusedKey;
    if (!isOpening) return;

    prepareKeycapAudio();
    const delays = [0, 90, 180, 270];
    const timers = delays.map((delay, index) =>
      window.setTimeout(() => playKeycapLandingSound(index), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [focusedKey]);

  return keycodeConverter === undefined ? (
    <></>
  ) : (
    <FocusedKeyContext.Provider
      value={{ focusedKey, setFocusedKey, onKeycodeChange: focusedKey?.onKeycodeChange }}
    >
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          pl: 1,
          pr: 1,
          backgroundColor: "#0f172a",
        }}
      >
        <LayerEditor
          {...props}
          layerCount={props.dynamicEntryCount.layer}
          keycodeConverter={keycodeConverter}
        ></LayerEditor>
      </Box>

      <Box
        aria-hidden={!focusedKey}
        className={focusedKey ? "keycatalog-surface-loaded" : ""}
        sx={{
          position: "relative",
          mt: focusedKey ? 2 : 0,
          maxHeight: focusedKey ? 620 : 0,
          opacity: focusedKey ? 1 : 0,
          transform: focusedKey ? "translateY(0)" : "translateY(-8px)",
          visibility: focusedKey ? "visible" : "hidden",
          pointerEvents: focusedKey ? "auto" : "none",
          backgroundColor: "#0f172a",
          width: "100%",
          maxWidth: "100%",
          overflowX: "auto",
          overflowY: focusedKey ? "auto" : "hidden",
          pb: focusedKey ? 3 : 0,
          pt: 0,
          transition: "max-height 220ms ease, margin-top 220ms ease, opacity 180ms ease, transform 220ms ease, visibility 220ms ease, padding-bottom 220ms ease",
        }}
      >
        <KeycodeCatalog
          keycodeConverter={keycodeConverter}
          tab={[
            { label: quantumTranslations[props.language].keycodeTabs.Basic, keygroup: ["basic"] },
            { label: quantumTranslations[props.language].keycodeTabs.Mouse, keygroup: ["mouse"] },
            { label: quantumTranslations[props.language].keycodeTabs.UserWireless, keygroup: ["custom"] },
            { label: quantumTranslations[props.language].keycodeTabs.Media, keygroup: ["media"] },
            { label: quantumTranslations[props.language].keycodeTabs.Quantum, keygroup: ["quantum", "magic"] },
            { label: quantumTranslations[props.language].keycodeTabs.RGB, keygroup: ["backlight", "rgb", "rgb_matrix"] },
            { label: quantumTranslations[props.language].keycodeTabs.Layer, keygroup: ["layer"] },
            { label: quantumTranslations[props.language].keycodeTabs.Macro, keygroup: ["macro"] },
            { label: quantumTranslations[props.language].keycodeTabs.TapDance, keygroup: ["tapdance"] },
          ]}
          comboCount={props.dynamicEntryCount.combo}
          overrideCount={props.dynamicEntryCount.override}
        ></KeycodeCatalog>
      </Box>
    </FocusedKeyContext.Provider>
  );
}

