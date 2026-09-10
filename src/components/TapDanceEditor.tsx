import { Box, Grid, TextField } from "@mui/material";
import { Fragment, useEffect, useRef, useState } from "react";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { EditableKey, KeymapKeyPopUp } from "./KeymapEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { FocusedKeyContext, KeymapKeyProperties } from "./keymap/keymapTypes";

export function TapDanceEditor(props: {
  via: ViaKeyboard;
  keycodeConverter: KeycodeConverter;
  tapdanceIndex: number;
  language?: "zh" | "en";
}) {
  const [tapDance, setTapDance] = useState<{ [id: string]: TapDanceValue }>({});
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.locks.request("load-tapdance", async () => {
      if (props.tapdanceIndex < 0) return;
      const td = (await props.via.GetTapDance([props.tapdanceIndex]))[0];
      const converted = props.keycodeConverter.convertTapDance(td);
      setTapDance((prev) => ({
        ...prev,
        [`${props.tapdanceIndex}`]: converted,
      }));
    });
  }, [props.tapdanceIndex, props.keycodeConverter, props.via]);

  const sendTapdance = (id: number, value: TapDanceValue) => {
    props.via.SetTapDance([
      {
        id: id,
        onTap: value.onTap.value,
        onHold: value.onHold.value,
        onDoubleTap: value.onDoubleTap.value,
        onTapHold: value.onTapHold.value,
        tappingTerm: value.tappingTerm,
      },
    ]);
  };

  const handleChange = (td: TapDanceValue) => {
    setTapDance((prev) => ({
      ...prev,
      [`${props.tapdanceIndex}`]: td,
    }));
    sendTapdance(props.tapdanceIndex, td);
  };

  return (
    <Box ref={boundaryRef} sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      <TapDanceEntry
        td={
          tapDance[props.tapdanceIndex] ?? {
            onTap: DefaultQmkKeycode,
            onHold: DefaultQmkKeycode,
            onDoubleTap: DefaultQmkKeycode,
            onTapHold: DefaultQmkKeycode,
            tappingTerm: 200,
          }
        }
        keycodeconverter={props.keycodeConverter}
        boundaryRef={boundaryRef}
        language={props.language}
        onChange={handleChange}
      ></TapDanceEntry>
    </Box>
  );
}

interface TapDanceValue {
  onTap: QmkKeycode;
  onHold: QmkKeycode;
  onDoubleTap: QmkKeycode;
  onTapHold: QmkKeycode;
  tappingTerm: number;
}

function TapDanceEntry(props: {
  td: TapDanceValue;
  keycodeconverter: KeycodeConverter;
  boundaryRef?: React.RefObject<HTMLDivElement>;
  language?: "zh" | "en";
  onChange?: (td: TapDanceValue) => void;
}) {
  const [tappingTerm, setTappingTerm] = useState(props.td.tappingTerm.toString());
  const [candidateTapdance, setCandidateTapdance] = useState<TapDanceValue>(props.td);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const [popupKeycode, setPopupKeycode] = useState(DefaultQmkKeycode);

  const t = quantumTranslations[props.language ?? "en"];
  const labels = t.tapDance;

  const updateCandidate = (updated: TapDanceValue) => {
    setCandidateTapdance(updated);
    props.onChange?.(updated);
  };

  const handleChange = [
    (value: QmkKeycode) => updateCandidate({ ...candidateTapdance, onTap: value }),
    (value: QmkKeycode) => updateCandidate({ ...candidateTapdance, onHold: value }),
    (value: QmkKeycode) => updateCandidate({ ...candidateTapdance, onDoubleTap: value }),
    (value: QmkKeycode) => updateCandidate({ ...candidateTapdance, onTapHold: value }),
  ];

  useEffect(() => {
    setCandidateTapdance(props.td);
    setTappingTerm(props.td.tappingTerm.toString());
  }, [props.td]);

  const focusedKey: KeymapKeyProperties | null =
    selectedKeyIndex === undefined
      ? null
      : {
          matrix: [], x: 0, y: 0, offsetx: 0, offsety: 0, r: 0, rx: 0, ry: 0, w: 1, h: 1,
          layout: [], keycode: [
            candidateTapdance.onTap,
            candidateTapdance.onHold,
            candidateTapdance.onDoubleTap,
            candidateTapdance.onTapHold,
          ][selectedKeyIndex],
          reactKey: selectedKeyIndex.toString(),
        };

  const tapDanceFields = [
    { label: labels.onTap, key: candidateTapdance.onTap },
    { label: labels.onHold, key: candidateTapdance.onHold },
    { label: labels.onDoubleTap, key: candidateTapdance.onDoubleTap },
    { label: labels.onTapHold, key: candidateTapdance.onTapHold },
  ];

  return (
    <FocusedKeyContext.Provider
      value={{
        focusedKey,
        setFocusedKey: () => {},
        onKeycodeChange: (_target, keycode) => {
          if (selectedKeyIndex !== undefined) handleChange[selectedKeyIndex](keycode);
        },
      }}
    >
    <Box sx={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
      <Box className={`entry-editor-panel ${selectedKeyIndex !== undefined ? "entry-editor-panel-with-candidates" : ""}`}>
      <Grid container spacing={1} sx={{ maxWidth: 480, mx: "auto", mt: 0 }}>
        {tapDanceFields.map((k, idx) => {
          return (
            <Fragment key={idx}>
              <Grid item xs={5}>
                <Box className="editor-field-label" alignContent={"center"} textAlign={"right"} height={"100%"}>
                  {k.label}
                </Box>
              </Grid>
              <Grid item xs={7}>
                <EditableKey
                  keycode={k.key}
                  isFocused={selectedKeyIndex === idx}
                  onClick={(target, ctrlKey) => {
                    setSelectedKeyIndex(idx);
                    if (ctrlKey) {
                      setPopupKeycode(k.key);
                      setPopupAnchor(target);
                      setPopupOpen(true);
                    }
                  }}
                  onKeycodeChange={handleChange[idx]}
                ></EditableKey>
              </Grid>
            </Fragment>
          );
        })}
      </Grid>
      <Box sx={{ position: "relative", width: "100%", mt: 1 }}>
        <Grid container spacing={1} sx={{ maxWidth: 480, mx: "auto" }}>
          <Grid item xs={5}>
            <Box className="editor-field-label" alignContent={"center"} textAlign={"right"} height={"100%"}>
              {labels.tappingTerm}
            </Box>
          </Grid>
          <Grid item xs={7}>
            <TextField
              value={tappingTerm}
              onChange={(event) => {
                setTappingTerm(event.target.value);
                const time = parseInt(event.target.value);
                if (0 <= time && time <= 0xffff) {
                  updateCandidate({ ...candidateTapdance, tappingTerm: time });
                }
              }}
              sx={{ maxWidth: 150 }}
              size="small"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        </Grid>
      </Box>
      </Box>
      {selectedKeyIndex !== undefined && (
        <Box className="entry-candidate-panel" sx={{ mt: 2 }}>
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
          if (selectedKeyIndex !== undefined) handleChange[selectedKeyIndex](event.keycode);
        }}
      />
    </Box>
    </FocusedKeyContext.Provider>
  );
}
