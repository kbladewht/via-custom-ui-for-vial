import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { ViaKeyboard } from "../../services/vialKeyboad";
import { AltRepeatKeyEditor } from "../AltRepeatKeyEditor";
import { ComboEditor } from "../ComboEditor";
import { KeycodeConverter } from "../keycodes/keycodeConverter";
import { OverrideEditor } from "../OverrideEditor";
import { TapDanceEditor } from "../TapDanceEditor";

export function ComboOverrideEditor(props: {
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage: string;
  dynamicEntryCount: { combo: number; override: number; layer: number; tapdance: number };
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [comboIndex, setComboIndex] = useState(0);

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      undefined,
      0,
      props.dynamicEntryCount.tapdance,
      props.keymapLanguage,
      "0.0.3",
      props.language,
    ).then((converter) => setKeycodeConverter(converter));
  }, [props.dynamicEntryCount, props.keymapLanguage, props.language]);

  if (!keycodeConverter) return null;

  return (
    <Box sx={{ width: "100%", minHeight: "calc(100vh - 180px)", p: 1, display: "flex", flexDirection: "column" }}>
      <Tabs value={comboIndex} onChange={(_event, index: number) => setComboIndex(index)} variant="scrollable" scrollButtons="auto" className="combo-tabs" sx={{ py: 0 }}>
        {Array.from({ length: props.dynamicEntryCount.combo }, (_, index) => (
          <Tab key={index} className="combo-entry-tab" label={index + 1} value={index} sx={{ width: 28, minWidth: 28, minHeight: 28, px: 0, color: "#b8c7dc", fontWeight: 600, textTransform: "none", border: "1px solid #334155", borderRadius: "8px 8px 0 0", backgroundColor: "rgba(30, 41, 59, 0.7)", "&.Mui-selected": { color: "#f8fafc", borderColor: "#475569", backgroundColor: "#334155" } }} />
        ))}
      </Tabs>
      {props.dynamicEntryCount.combo > 0 && (
        <ComboEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          comboIndex={comboIndex}
          language={props.language}
        />
      )}
    </Box>
  );
}

export function TapDanceSelector(props: {
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage: string;
  dynamicEntryCount: { combo: number; override: number; layer: number; tapdance: number };
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [editorIndex, setEditorIndex] = useState<number>(0);

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      undefined,
      0,
      props.dynamicEntryCount.tapdance,
      props.keymapLanguage,
      "0.0.3",
      props.language,
    ).then((converter) => setKeycodeConverter(converter));
  }, [props.dynamicEntryCount, props.keymapLanguage, props.language]);

  if (!keycodeConverter) return null;

  return (
    <Box sx={{ width: "100%", minHeight: "calc(100vh - 180px)", p: 1, display: "flex", flexDirection: "column" }}>
      <Tabs
        value={editorIndex}
        onChange={(_event, index: number) => setEditorIndex(index)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Tap Dance entries"
        className="entry-tabs tapdance-entry-tabs"
        sx={{
          py: 0,
          "& .MuiTabs-flexContainer": {
            justifyContent: "flex-start",
          },
        }}
      >
        {Array.from({ length: props.dynamicEntryCount.tapdance }, (_, index) => (
          <Tab
            key={index}
            className="entry-tab tapdance-selector-entry-tab"
            label={index}
            value={index}
            sx={{
              width: 28,
              minWidth: 28,
              minHeight: 28,
              px: 0,
              color: "#b8c7dc",
              fontWeight: 600,
              textTransform: "none",
              border: "1px solid #334155",
              borderRadius: "8px 8px 0 0",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              "&.Mui-selected": {
                color: "#f8fafc",
                borderColor: "#475569",
                backgroundColor: "#334155",
              },
            }}
          />
        ))}
      </Tabs>
      {props.dynamicEntryCount.tapdance > 0 && (
        <TapDanceEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          tapdanceIndex={editorIndex}
          language={props.language}
        />
      )}
    </Box>
  );
}

export function KeyOverrideSelector(props: {
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage: string;
  dynamicEntryCount: { combo: number; override: number; layer: number; tapdance: number };
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [editorIndex, setEditorIndex] = useState<number>(0);

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      undefined,
      0,
      props.dynamicEntryCount.tapdance,
      props.keymapLanguage,
      "0.0.3",
      props.language,
    ).then((converter) => setKeycodeConverter(converter));
  }, [props.dynamicEntryCount, props.keymapLanguage, props.language]);

  if (!keycodeConverter) return null;

  return (
    <Box sx={{ width: "100%", minHeight: "calc(100vh - 180px)", p: 1, display: "flex", flexDirection: "column" }}>
      <Tabs
        value={editorIndex}
        onChange={(_event, index: number) => setEditorIndex(index)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Key Overrides entries"
        className="entry-tabs key-override-tabs"
        sx={{
          py: 0,
          "& .MuiTabs-flexContainer": {
            justifyContent: "flex-start",
          },
        }}
      >
        {Array.from({ length: props.dynamicEntryCount.override }, (_, index) => (
          <Tab
            key={index}
            className="entry-tab key-override-entry-tab"
            label={index + 1}
            value={index}
            sx={{
              width: 28,
              minWidth: 28,
              minHeight: 28,
              px: 0,
              color: "#b8c7dc",
              fontWeight: 600,
              textTransform: "none",
              border: "1px solid #334155",
              borderRadius: "8px 8px 0 0",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              "&.Mui-selected": {
                color: "#f8fafc",
                borderColor: "#475569",
                backgroundColor: "#334155",
              },
            }}
          />
        ))}
      </Tabs>
      {props.dynamicEntryCount.override > 0 && (
        <Box className="entry-content-panel key-override-content-panel" sx={{ width: "100%", flex: 1, mt: 0, display: "flex" }}>
          <OverrideEditor
            via={props.via}
            keycodeConverter={keycodeConverter}
            overrideIndex={editorIndex}
            language={props.language}
          />
        </Box>
      )}
    </Box>
  );
}

export function AltRepeatKeySelector(props: {
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage: string;
  dynamicEntryCount: { combo: number; override: number; layer: number; tapdance: number };
  count?: number;
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [editorIndex, setEditorIndex] = useState<number>(0);
  const repeatCount = props.count ?? 32;

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      undefined,
      0,
      props.dynamicEntryCount.tapdance,
      props.keymapLanguage,
      "0.0.3",
      props.language,
    ).then((converter) => setKeycodeConverter(converter));
  }, [props.dynamicEntryCount, props.keymapLanguage, props.language]);

  if (!keycodeConverter) return null;

  return (
    <Box sx={{ width: "100%", minHeight: "calc(100vh - 180px)", p: 1, display: "flex", flexDirection: "column" }}>
      <Tabs
        value={editorIndex}
        onChange={(_event, index: number) => setEditorIndex(index)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Alt Repeat Key entries"
        className="entry-tabs alt-repeat-tabs"
        sx={{
          py: 0,
          "& .MuiTabs-flexContainer": {
            justifyContent: "flex-start",
          },
        }}
      >
        {Array.from({ length: repeatCount }, (_, index) => (
          <Tab
            key={index}
            className="entry-tab alt-repeat-entry-tab"
            label={index + 1}
            value={index}
            sx={{
              width: 28,
              minWidth: 28,
              minHeight: 28,
              px: 0,
              color: "#b8c7dc",
              fontWeight: 600,
              textTransform: "none",
              border: "1px solid #334155",
              borderRadius: "8px 8px 0 0",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              "&.Mui-selected": {
                color: "#f8fafc",
                borderColor: "#475569",
                backgroundColor: "#334155",
              },
            }}
          />
        ))}
      </Tabs>
      <Box className="entry-content-panel alt-repeat-content-panel" sx={{ width: "100%", flex: 1, mt: 2, display: "flex" }}>
        <AltRepeatKeyEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          altRepeatIndex={editorIndex}
          language={props.language}
        />
      </Box>
    </Box>
  );
}
