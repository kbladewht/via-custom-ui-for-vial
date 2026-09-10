import { Box, Grid } from "@mui/material";
import { Fragment, useEffect, useRef, useState } from "react";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { EditableKey, KeymapKeyPopUp } from "./KeymapEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { FocusedKeyContext, KeymapKeyProperties } from "./keymap/keymapTypes";

export function ComboEditor(props: {
  via: ViaKeyboard;
  keycodeConverter: KeycodeConverter;
  comboIndex: number;
  language?: "zh" | "en";
}) {
  const [combo, setCombo] = useState<{ [id: string]: ComboValue }>({});
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.locks.request("load-combo", async () => {
      if (props.comboIndex < 0) return;

      const comboValue = (await props.via.GetCombo([props.comboIndex]))[0];
      const newCombo = { ...combo };
      newCombo[`${props.comboIndex}`] = {
        keys: [
          props.keycodeConverter.convertIntToKeycode(comboValue.key1),
          props.keycodeConverter.convertIntToKeycode(comboValue.key2),
          props.keycodeConverter.convertIntToKeycode(comboValue.key3),
          props.keycodeConverter.convertIntToKeycode(comboValue.key4),
          props.keycodeConverter.convertIntToKeycode(comboValue.output),
        ],
      };
      setCombo(newCombo);
      console.log(newCombo);
    });
  }, [props.comboIndex, props.keycodeConverter]);

  const sendCombo = (id: number, combo: ComboValue) => {
    props.via.SetCombo([
      {
        id: id,
        key1: combo.keys[0].value,
        key2: combo.keys[1].value,
        key3: combo.keys[2].value,
        key4: combo.keys[3].value,
        output: combo.keys[4].value,
      },
    ]);
  };

  const handleChange = (newCombo: ComboValue) => {
    const newComboSet = { ...combo };
    newComboSet[props.comboIndex] = newCombo;
    setCombo(newComboSet);
    sendCombo(props.comboIndex, newCombo);
    console.log(`update combo ${props.comboIndex}`);
  };

  return (
    <Box ref={boundaryRef} sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      <ComboEntry
        combo={
          combo[props.comboIndex] ?? {
            keys: [
              DefaultQmkKeycode,
              DefaultQmkKeycode,
              DefaultQmkKeycode,
              DefaultQmkKeycode,
              DefaultQmkKeycode,
            ],
          }
        }
        keycodeconverter={props.keycodeConverter}
        boundaryRef={boundaryRef}
        language={props.language}
        onChange={handleChange}
      ></ComboEntry>
    </Box>
  );
}

interface ComboValue {
  keys: [QmkKeycode, QmkKeycode, QmkKeycode, QmkKeycode, QmkKeycode];
}

function ComboEntry(props: {
  combo: ComboValue;
  keycodeconverter: KeycodeConverter;
  boundaryRef?: React.RefObject<HTMLDivElement>;
  language?: "zh" | "en";
  onChange?: (combo: ComboValue) => void;
}) {
  const [candidateCombo, setCandidateCombo] = useState<ComboValue>(props.combo);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const [popupKeycode, setPopupKeycode] = useState(DefaultQmkKeycode);

  const t = quantumTranslations[props.language ?? "en"];
  const keyLabels = t.combos.keys;

  useEffect(() => {
    setCandidateCombo(props.combo);
  }, [props.combo]);

  const updateCandidate = (updated: ComboValue) => {
    setCandidateCombo(updated);
    props.onChange?.(updated);
  };

  const focusedKey: KeymapKeyProperties | null =
    selectedKeyIndex === undefined
      ? null
      : {
          matrix: [], x: 0, y: 0, offsetx: 0, offsety: 0, r: 0, rx: 0, ry: 0, w: 1, h: 1,
          layout: [], keycode: candidateCombo.keys[selectedKeyIndex], reactKey: selectedKeyIndex.toString(),
        };

  return (
    <FocusedKeyContext.Provider
      value={{
        focusedKey,
        setFocusedKey: () => {},
        onKeycodeChange: (_target, keycode) => {
          if (selectedKeyIndex !== undefined) {
            updateCandidate({
              keys: candidateCombo.keys.map((key, index) => (index === selectedKeyIndex ? keycode : key)),
            } as ComboValue);
          }
        },
      }}
    >
      <Box sx={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
      <Box className="combo-editor-panel">
      <Grid container spacing={1} sx={{ maxWidth: 480, mx: "auto", mt: 0 }}>
        {candidateCombo.keys.map((k, idx) => {
          return (
            <Fragment key={idx}>
              <Grid item xs={5}>
                <Box
                  alignContent={"center"}
                  textAlign={"right"}
                  height={"100%"}
                  sx={{ color: "#e5eefb", fontWeight: 500 }}
                >
                  {keyLabels[idx]}
                </Box>
              </Grid>
              <Grid item xs={7}>
                <EditableKey
                  keycode={k}
                  isFocused={selectedKeyIndex === idx}
                  onClick={(target, ctrlKey) => {
                    setSelectedKeyIndex(idx);
                    if (ctrlKey) {
                      setPopupKeycode(k);
                      setPopupAnchor(target);
                      setPopupOpen(true);
                    }
                  }}
                  onKeycodeChange={(keycode) => {
                    updateCandidate({
                      keys: candidateCombo.keys.map((k, id) => (id == idx ? keycode : k)),
                    } as ComboValue);
                  }}
                ></EditableKey>
              </Grid>
            </Fragment>
          );
        })}
      </Grid>
      </Box>
      {selectedKeyIndex !== undefined && (
        <Box className="combo-candidate-panel" sx={{ mt: 2 }}>
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
          if (selectedKeyIndex !== undefined) {
            setCandidateCombo({
              keys: candidateCombo.keys.map((key, index) => (index === selectedKeyIndex ? event.keycode : key)),
            } as ComboValue);
          }
        }}
      />
      </Box>
    </FocusedKeyContext.Provider>
  );
}
