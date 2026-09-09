import { Box, Button, Checkbox, FormControlLabel, Grid, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { EditableKey, KeymapKeyPopUp } from "./KeymapEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { FocusedKeyContext, KeymapKeyProperties } from "./keymap/keymapTypes";

export interface OverrideValue {
  trigger: QmkKeycode;
  replacement: QmkKeycode;
  layers: number;
  triggerMods: number;
  negativeModMask: number;
  suppressedMods: number;
  options: number;
}

export const defaultOverrideValue: OverrideValue = {
  trigger: DefaultQmkKeycode,
  replacement: DefaultQmkKeycode,
  layers: 0xffff,
  triggerMods: 0,
  negativeModMask: 0,
  suppressedMods: 0,
  options: (1 << 0) | (1 << 1) | (1 << 2),
};

export function OverrideEditor(props: {
  via: ViaKeyboard;
  keycodeConverter: KeycodeConverter;
  overrideIndex: number;
  language?: "zh" | "en";
}) {
  const [override, setOverride] = useState<{ [id: string]: OverrideValue }>({});
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.locks.request("load-override", async () => {
      if (props.overrideIndex < 0) return;

      const overrideValue = (await props.via.GetOverride([props.overrideIndex]))[0];
      if (!overrideValue) return;

      const converted: OverrideValue = {
        ...overrideValue,
        trigger: props.keycodeConverter.convertIntToKeycode(overrideValue.trigger),
        replacement: props.keycodeConverter.convertIntToKeycode(overrideValue.replacement),
      };

      setOverride((prev) => ({
        ...prev,
        [`${props.overrideIndex}`]: converted,
      }));
    });
  }, [props.overrideIndex, props.keycodeConverter, props.via]);

  const sendOverride = (id: number, value: OverrideValue) => {
    props.via.SetOverride([
      {
        id: id,
        trigger: value.trigger.value,
        replacement: value.replacement.value,
        layers: value.layers,
        triggerMods: value.triggerMods,
        negativeModMask: value.negativeModMask,
        suppressedMods: value.suppressedMods,
        options: value.options,
      },
    ]);
  };

  const handleChange = (newOverride: OverrideValue) => {
    setOverride((prev) => ({
      ...prev,
      [`${props.overrideIndex}`]: newOverride,
    }));
    sendOverride(props.overrideIndex, newOverride);
  };

  return (
    <Box ref={boundaryRef} sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      <OverrideEntry
        override={override[props.overrideIndex] ?? defaultOverrideValue}
        keycodeconverter={props.keycodeConverter}
        boundaryRef={boundaryRef}
        language={props.language}
        onChange={handleChange}
      />
    </Box>
  );
}

const MODIFIERS = [
  { label: "LCtrl", bit: 0 },
  { label: "LShift", bit: 1 },
  { label: "LAlt", bit: 2 },
  { label: "LGui", bit: 3 },
  { label: "RCtrl", bit: 4 },
  { label: "RShift", bit: 5 },
  { label: "RAlt", bit: 6 },
  { label: "RGui", bit: 7 },
];

const OVERRIDE_OPTIONS = [
  { index: 0, bit: 0 },
  { index: 1, bit: 1 },
  { index: 2, bit: 2 },
  { index: 3, bit: 3 },
  { index: 4, bit: 4 },
  { index: 5, bit: 5 },
];

function OverrideEntry(props: {
  override: OverrideValue;
  keycodeconverter: KeycodeConverter;
  boundaryRef?: React.RefObject<HTMLDivElement>;
  language?: "zh" | "en";
  onChange?: (override: OverrideValue) => void;
}) {
  const [candidateOverride, setCandidateOverride] = useState<OverrideValue>(props.override);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>(); // 0: trigger, 1: replacement
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const [popupKeycode, setPopupKeycode] = useState(DefaultQmkKeycode);

  const t = quantumTranslations[props.language ?? "en"];
  const labels = t.keyOverride;

  useEffect(() => {
    setCandidateOverride(props.override);
  }, [props.override]);

  const updateCandidate = (newVal: OverrideValue) => {
    setCandidateOverride(newVal);
    props.onChange?.(newVal);
  };

  const focusedKey: KeymapKeyProperties | null =
    selectedKeyIndex === undefined
      ? null
      : {
          matrix: [],
          x: 0,
          y: 0,
          offsetx: 0,
          offsety: 0,
          r: 0,
          rx: 0,
          ry: 0,
          w: 1,
          h: 1,
          layout: [],
          keycode: selectedKeyIndex === 0 ? candidateOverride.trigger : candidateOverride.replacement,
          reactKey: selectedKeyIndex.toString(),
        };

  return (
    <FocusedKeyContext.Provider
      value={{
        focusedKey,
        setFocusedKey: () => {},
        onKeycodeChange: (_target, keycode) => {
          if (selectedKeyIndex === 0) {
            updateCandidate({ ...candidateOverride, trigger: keycode });
          } else if (selectedKeyIndex === 1) {
            updateCandidate({ ...candidateOverride, replacement: keycode });
          }
        },
      }}
    >
      <Box sx={{ flex: 1, position: "relative" }}>
        <Grid container spacing={2} sx={{ maxWidth: 840, mx: "auto", mt: 0 }}>
          {/* Enable */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {labels.enable}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Checkbox
              size="small"
              checked={(candidateOverride.options & (1 << 7)) !== 0}
              onChange={(_event, checked) => {
                updateCandidate({
                  ...candidateOverride,
                  options: (candidateOverride.options & ~(1 << 7)) | (checked ? 1 << 7 : 0),
                });
              }}
              sx={{ color: "#64748b", "&.Mui-checked": { color: "#38bdf8" }, p: 0.5 }}
            />
          </Grid>

          {/* Enable on layers */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {labels.enableOnLayers}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "2px 4px",
                alignItems: "center",
                maxWidth: 480,
              }}
            >
              {[...Array(16)].map((_, idx) => (
                <FormControlLabel
                  key={idx}
                  label={<Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{idx}</Typography>}
                  control={
                    <Checkbox
                      size="small"
                      checked={(candidateOverride.layers & (1 << idx)) !== 0}
                      onChange={(_event, checked) => {
                        updateCandidate({
                          ...candidateOverride,
                          layers: (candidateOverride.layers & ~(1 << idx)) | (checked ? 1 << idx : 0),
                        });
                      }}
                      sx={{ color: "#64748b", "&.Mui-checked": { color: "#38bdf8" }, p: "2px" }}
                    />
                  }
                  sx={{ m: 0 }}
                />
              ))}
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => updateCandidate({ ...candidateOverride, layers: 0xffff })}
                sx={{
                  color: "#cbd5e1",
                  borderColor: "#475569",
                  backgroundColor: "#1e293b",
                  textTransform: "none",
                  py: 0.25,
                  px: 1,
                  fontSize: "0.75rem",
                }}
              >
                {labels.enableAll}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => updateCandidate({ ...candidateOverride, layers: 0x0000 })}
                sx={{
                  color: "#cbd5e1",
                  borderColor: "#475569",
                  backgroundColor: "#1e293b",
                  textTransform: "none",
                  py: 0.25,
                  px: 1,
                  fontSize: "0.75rem",
                }}
              >
                {labels.disableAll}
              </Button>
            </Box>
          </Grid>

          {/* Trigger */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {labels.trigger}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <EditableKey
              keycode={candidateOverride.trigger}
              isFocused={selectedKeyIndex === 0}
              onClick={(target, ctrlKey) => {
                setSelectedKeyIndex(0);
                if (ctrlKey) {
                  setPopupKeycode(candidateOverride.trigger);
                  setPopupAnchor(target);
                  setPopupOpen(true);
                }
              }}
              onKeycodeChange={(keycode) => {
                updateCandidate({ ...candidateOverride, trigger: keycode });
              }}
            />
          </Grid>

          {/* Trigger mods */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {labels.triggerMods}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <ModifierCheckbox
              value={candidateOverride.triggerMods}
              onChange={(value) => updateCandidate({ ...candidateOverride, triggerMods: value })}
            />
          </Grid>

          {/* Negative mods */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {labels.negativeMods}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <ModifierCheckbox
              value={candidateOverride.negativeModMask}
              onChange={(value) => updateCandidate({ ...candidateOverride, negativeModMask: value })}
            />
          </Grid>

          {/* Suppressed mods */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {labels.suppressedMods}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <ModifierCheckbox
              value={candidateOverride.suppressedMods}
              onChange={(value) => updateCandidate({ ...candidateOverride, suppressedMods: value })}
            />
          </Grid>

          {/* Replacement */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {labels.replacement}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <EditableKey
              keycode={candidateOverride.replacement}
              isFocused={selectedKeyIndex === 1}
              onClick={(target, ctrlKey) => {
                setSelectedKeyIndex(1);
                if (ctrlKey) {
                  setPopupKeycode(candidateOverride.replacement);
                  setPopupAnchor(target);
                  setPopupOpen(true);
                }
              }}
              onKeycodeChange={(keycode) => {
                updateCandidate({ ...candidateOverride, replacement: keycode });
              }}
            />
          </Grid>

          {/* Options */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {labels.options}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {OVERRIDE_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.bit}
                  label={
                    <Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {labels.optionLabels[opt.index]}
                    </Typography>
                  }
                  control={
                    <Checkbox
                      size="small"
                      checked={(candidateOverride.options & (1 << opt.bit)) !== 0}
                      onChange={(_event, checked) => {
                        updateCandidate({
                          ...candidateOverride,
                          options: (candidateOverride.options & ~(1 << opt.bit)) | (checked ? 1 << opt.bit : 0),
                        });
                      }}
                      sx={{ color: "#64748b", "&.Mui-checked": { color: "#38bdf8" }, p: "2px" }}
                    />
                  }
                  sx={{ m: 0 }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* Keycode catalog for selecting trigger / replacement */}
        {selectedKeyIndex !== undefined && (
          <Box sx={{ maxHeight: 360, overflowY: "auto", mt: 2 }}>
            <KeycodeCatalog
              keycodeConverter={props.keycodeconverter}
              tab={[
                { label: "Basic", keygroup: ["basic"] },
                { label: "Mouse", keygroup: ["mouse"] },
                { label: "Media", keygroup: ["media"] },
                { label: "Quantum", keygroup: ["quantum", "magic"] },
                { label: "Layer", keygroup: ["layer"] },
                { label: "Macro", keygroup: ["macro"] },
                { label: "Tap Dance", keygroup: ["tapdance"] },
              ]}
            />
          </Box>
        )}

        <KeymapKeyPopUp
          open={popupOpen}
          keycode={popupKeycode}
          keycodeconverter={props.keycodeconverter}
          anchor={popupAnchor}
          boundary={props.boundaryRef?.current ?? null}
          onClickAway={() => {
            setPopupOpen(false);
            setPopupAnchor(undefined);
          }}
          onChange={(event) => {
            setPopupKeycode(event.keycode);
            if (selectedKeyIndex === 0) {
              updateCandidate({ ...candidateOverride, trigger: event.keycode });
            } else if (selectedKeyIndex === 1) {
              updateCandidate({ ...candidateOverride, replacement: event.keycode });
            }
          }}
        />
      </Box>
    </FocusedKeyContext.Provider>
  );
}

function ModifierCheckbox(props: { value: number; onChange: (value: number) => void }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "2px 4px",
      }}
    >
      {MODIFIERS.map((mod) => (
        <FormControlLabel
          key={mod.label}
          label={<Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{mod.label}</Typography>}
          control={
            <Checkbox
              size="small"
              checked={(props.value & (1 << mod.bit)) !== 0}
              onChange={(_event, checked) => {
                props.onChange((props.value & ~(1 << mod.bit)) | (checked ? 1 << mod.bit : 0));
              }}
              sx={{ color: "#64748b", "&.Mui-checked": { color: "#38bdf8" }, p: "2px" }}
            />
          }
          sx={{ m: 0 }}
        />
      ))}
    </Box>
  );
}
