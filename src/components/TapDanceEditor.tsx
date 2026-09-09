import { Box, Button, Grid, TextField } from "@mui/material";
import { Fragment, useEffect, useRef, useState } from "react";
import { ViaKeyboard } from "../services/vialKeyboad";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { EditableKey, KeymapKeyPopUp } from "./KeymapEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { FocusedKeyContext, KeymapKeyProperties } from "./keymapTypes";

export function TapDanceEditor(props: {
  via: ViaKeyboard;
  keycodeConverter: KeycodeConverter;
  tapdanceIndex: number;
}) {
  const [tapDance, setTapDance] = useState<{ [id: string]: TapDanceValue }>({});
  const boundaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.locks.request("load-tapdance", async () => {
      if (props.tapdanceIndex < 0) return;
      const td = (await props.via.GetTapDance([props.tapdanceIndex]))[0];
      const newTapDance = { ...tapDance };
      newTapDance[`${props.tapdanceIndex}`] = props.keycodeConverter.convertTapDance(td);
      setTapDance(newTapDance);
    });
  }, [props.tapdanceIndex, props.keycodeConverter]);

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

  return (
    <Box ref={boundaryRef} sx={{ width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* <Box>{`Edit TD${props.tapdanceIndex}`}</Box> */}
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
        onSave={(td: TapDanceValue) => {
          console.log(`Set TD${props.tapdanceIndex}`);
          console.log(td);
          sendTapdance(props.tapdanceIndex, td);
        }}
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
  onSave?: (td: TapDanceValue) => void;
}) {
  const [tappingTerm, setTappingTerm] = useState(props.td.tappingTerm.toString());
  const [candidateTapdance, setCandidateTapdance] = useState<TapDanceValue>(props.td);
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const [popupKeycode, setPopupKeycode] = useState(DefaultQmkKeycode);

  const handleChange = [
    (value: QmkKeycode) => setCandidateTapdance({ ...candidateTapdance, onTap: value }),
    (value: QmkKeycode) => setCandidateTapdance({ ...candidateTapdance, onHold: value }),
    (value: QmkKeycode) => setCandidateTapdance({ ...candidateTapdance, onDoubleTap: value }),
    (value: QmkKeycode) => setCandidateTapdance({ ...candidateTapdance, onTapHold: value }),
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
    <Box sx={{ flex: 1, position: "relative" }}>
      <Grid container spacing={1} sx={{ maxWidth: 480, mx: "auto", mt: 0 }}>
        {[
          {
            label: "On tap",
            key: candidateTapdance.onTap,
          },
          {
            label: "On hold",
            key: candidateTapdance.onHold,
          },
          {
            label: "On double tap",
            key: candidateTapdance.onDoubleTap,
          },
          {
            label: "On tap + hold",
            key: candidateTapdance.onTapHold,
          },
        ].map((k, idx) => {
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
        <Grid item xs={5}>
          <Box className="editor-field-label" alignContent={"center"} textAlign={"right"} height={"100%"}>
            Tapping term [ms]
          </Box>
        </Grid>
        <Grid item xs={7}>
          <TextField
            value={tappingTerm}
            onChange={(event) => {
              setTappingTerm(event.target.value);
              const time = parseInt(event.target.value);
              if (0 <= time && time <= 0xffff) {
                setCandidateTapdance({ ...candidateTapdance, tappingTerm: time });
              }
            }}
            sx={{ maxWidth: 150 }}
            size="small"
            type="number"
            InputLabelProps={{
              shrink: true,
            }}
          ></TextField>
        </Grid>
      </Grid>
      <Box sx={{ position: "absolute", right: 0, bottom: 0, display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => setCandidateTapdance(props.td)}
          sx={{ color: "#e2e8f0", borderColor: "#64748b", backgroundColor: "#334155" }}
        >
          Revert
        </Button>
          <Button
            variant="outlined"
            onClick={() => props.onSave?.(candidateTapdance)}
            sx={{ color: "#f8fafc", borderColor: "#64748b", backgroundColor: "#334155" }}
          >
            Save
          </Button>
      </Box>
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
          if (selectedKeyIndex !== undefined) handleChange[selectedKeyIndex](event.keycode);
        }}
      />
    </Box>
    </FocusedKeyContext.Provider>
  );
}
