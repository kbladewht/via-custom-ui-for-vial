import { Box, Checkbox, FormControlLabel, Grid, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { ViaKeyboard } from "../services/vialKeyboad";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { EditableKey, KeymapKeyPopUp } from "./KeymapEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { FocusedKeyContext, KeymapKeyProperties } from "./keymapTypes";

export interface AltRepeatKeyValue {
  lastKey: QmkKeycode;
  altKey: QmkKeycode;
  allowedMods: number;
  options: number;
}

export const defaultAltRepeatKeyValue: AltRepeatKeyValue = {
  lastKey: DefaultQmkKeycode,
  altKey: DefaultQmkKeycode,
  allowedMods: 0,
  options: 0,
};

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

const ALT_REPEAT_OPTIONS = [
  { label: "Default to this alt key", bit: 0 },
  { label: "Bidirectional", bit: 1 },
  { label: "Ignore mod handedness", bit: 2 },
];

export function AltRepeatKeyEditor(props: {
  via: ViaKeyboard;
  keycodeConverter: KeycodeConverter;
  altRepeatIndex: number;
  language?: "zh" | "en";
}) {
  const [altRepeat, setAltRepeat] = useState<{ [id: string]: AltRepeatKeyValue }>({});
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.locks.request("load-alt-repeat", async () => {
      if (props.altRepeatIndex < 0) return;

      if (typeof (props.via as unknown as { GetAltRepeat?: (ids: number[]) => Promise<unknown[]> }).GetAltRepeat === "function") {
        try {
          const val = (await (props.via as unknown as { GetAltRepeat: (ids: number[]) => Promise<{ lastKey: number; altKey: number; allowedMods: number; options: number }[]> }).GetAltRepeat([props.altRepeatIndex]))[0];
          if (val) {
            setAltRepeat((prev) => ({
              ...prev,
              [`${props.altRepeatIndex}`]: {
                ...val,
                lastKey: props.keycodeConverter.convertIntToKeycode(val.lastKey),
                altKey: props.keycodeConverter.convertIntToKeycode(val.altKey),
              },
            }));
            return;
          }
        } catch {
          // fallback to local cache
        }
      }
    });
  }, [props.altRepeatIndex, props.keycodeConverter, props.via]);

  const sendAltRepeat = async (id: number, value: AltRepeatKeyValue) => {
    if (typeof (props.via as unknown as { SetAltRepeat?: (values: unknown[]) => Promise<void> }).SetAltRepeat === "function") {
      try {
        await (props.via as unknown as { SetAltRepeat: (values: unknown[]) => Promise<void> }).SetAltRepeat([
          {
            id,
            lastKey: value.lastKey.value,
            altKey: value.altKey.value,
            allowedMods: value.allowedMods,
            options: value.options,
          },
        ]);
      } catch (e) {
        console.warn("SetAltRepeat error:", e);
      }
    }
  };

  const handleUpdate = (newVal: AltRepeatKeyValue) => {
    setAltRepeat((prev) => ({
      ...prev,
      [`${props.altRepeatIndex}`]: newVal,
    }));
    void sendAltRepeat(props.altRepeatIndex, newVal);
  };

  return (
    <Box ref={boundaryRef} sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      <AltRepeatKeyEntry
        altRepeat={altRepeat[props.altRepeatIndex] ?? defaultAltRepeatKeyValue}
        keycodeconverter={props.keycodeConverter}
        boundaryRef={boundaryRef}
        language={props.language}
        onChange={handleUpdate}
      />
    </Box>
  );
}

function AltRepeatKeyEntry(props: {
  altRepeat: AltRepeatKeyValue;
  keycodeconverter: KeycodeConverter;
  boundaryRef?: React.RefObject<HTMLDivElement>;
  language?: "zh" | "en";
  onChange?: (val: AltRepeatKeyValue) => void;
}) {
  const [candidate, setCandidate] = useState<AltRepeatKeyValue>(props.altRepeat);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>(); // 0: lastKey, 1: altKey
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const [popupKeycode, setPopupKeycode] = useState(DefaultQmkKeycode);

  const isZh = props.language === "zh";

  useEffect(() => {
    setCandidate(props.altRepeat);
  }, [props.altRepeat]);

  const updateCandidate = (updated: AltRepeatKeyValue) => {
    setCandidate(updated);
    props.onChange?.(updated);
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
          keycode: selectedKeyIndex === 0 ? candidate.lastKey : candidate.altKey,
          reactKey: selectedKeyIndex.toString(),
        };

  return (
    <FocusedKeyContext.Provider
      value={{
        focusedKey,
        setFocusedKey: () => {},
        onKeycodeChange: (_target, keycode) => {
          if (selectedKeyIndex === 0) {
            updateCandidate({ ...candidate, lastKey: keycode });
          } else if (selectedKeyIndex === 1) {
            updateCandidate({ ...candidate, altKey: keycode });
          }
        },
      }}
    >
      <Box sx={{ flex: 1, position: "relative" }}>
        <Grid container spacing={2} sx={{ maxWidth: 780, mx: "auto", mt: 0 }}>
          {/* Enable */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {isZh ? "启用" : "Enable"}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Checkbox
              size="small"
              checked={(candidate.options & (1 << 7)) !== 0}
              onChange={(_event, checked) => {
                updateCandidate({
                  ...candidate,
                  options: (candidate.options & ~(1 << 7)) | (checked ? 1 << 7 : 0),
                });
              }}
              sx={{ color: "#64748b", "&.Mui-checked": { color: "#38bdf8" }, p: 0.5 }}
            />
          </Grid>

          {/* Last key */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {isZh ? "上一键" : "Last key"}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <EditableKey
              keycode={candidate.lastKey}
              isFocused={selectedKeyIndex === 0}
              onClick={(target, ctrlKey) => {
                setSelectedKeyIndex(0);
                if (ctrlKey) {
                  setPopupKeycode(candidate.lastKey);
                  setPopupAnchor(target);
                  setPopupOpen(true);
                }
              }}
              onKeycodeChange={(keycode) => {
                updateCandidate({ ...candidate, lastKey: keycode });
              }}
            />
          </Grid>

          {/* Alt key */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="center" textAlign="right" height="100%">
              {isZh ? "替代键" : "Alt key"}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <EditableKey
              keycode={candidate.altKey}
              isFocused={selectedKeyIndex === 1}
              onClick={(target, ctrlKey) => {
                setSelectedKeyIndex(1);
                if (ctrlKey) {
                  setPopupKeycode(candidate.altKey);
                  setPopupAnchor(target);
                  setPopupOpen(true);
                }
              }}
              onKeycodeChange={(keycode) => {
                updateCandidate({ ...candidate, altKey: keycode });
              }}
            />
          </Grid>

          {/* Allowed mods */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {isZh ? "允许修饰键" : "Allowed mods"}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "2px 4px",
                maxWidth: 480,
              }}
            >
              {MODIFIERS.map((mod) => (
                <FormControlLabel
                  key={mod.label}
                  label={<Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1" }}>{mod.label}</Typography>}
                  control={
                    <Checkbox
                      size="small"
                      checked={(candidate.allowedMods & (1 << mod.bit)) !== 0}
                      onChange={(_event, checked) => {
                        updateCandidate({
                          ...candidate,
                          allowedMods: (candidate.allowedMods & ~(1 << mod.bit)) | (checked ? 1 << mod.bit : 0),
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

          {/* Options */}
          <Grid item xs={3}>
            <Box className="editor-field-label" alignContent="flex-start" textAlign="right" pt={0.5}>
              {isZh ? "选项" : "Options"}
            </Box>
          </Grid>
          <Grid item xs={9}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
              {ALT_REPEAT_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.bit}
                  label={
                    <Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {isZh
                        ? opt.bit === 0
                          ? "默认使用此替代键"
                          : opt.bit === 1
                            ? "双向生效"
                            : "忽略左右修饰键方向"
                        : opt.label}
                    </Typography>
                  }
                  control={
                    <Checkbox
                      size="small"
                      checked={(candidate.options & (1 << opt.bit)) !== 0}
                      onChange={(_event, checked) => {
                        updateCandidate({
                          ...candidate,
                          options: (candidate.options & ~(1 << opt.bit)) | (checked ? 1 << opt.bit : 0),
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

        {/* Keycode catalog for selecting lastKey / altKey */}
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
              updateCandidate({ ...candidate, lastKey: event.keycode });
            } else if (selectedKeyIndex === 1) {
              updateCandidate({ ...candidate, altKey: event.keycode });
            }
          }}
        />
      </Box>
    </FocusedKeyContext.Provider>
  );
}
