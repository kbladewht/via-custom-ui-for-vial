import {
  Autocomplete,
  Box,
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  FormGroup,
  Popper,
  TextField,
  Typography,
} from "@mui/material";
import { matchSorter } from "match-sorter";
import { useEffect, useRef, useState } from "react";
import { DefaultQmkKeycode, KeycodeConverter, ModifierBit, ModifierBits, QmkKeycode } from "./keycodes/keycodeConverter";
import { KeymapKeyProperties } from "./keymap/keymapTypes";

export function KeymapKeyPopUp(props: {
  open: boolean;
  keycodeconverter: KeycodeConverter;
  keycode: QmkKeycode;
  anchor?: HTMLElement;
  boundary: HTMLElement | null;
  keymapKey?: KeymapKeyProperties;
  onClickAway?: () => void;
  onChange?: (event: { keymapkey?: KeymapKeyProperties; keycode: QmkKeycode }) => void;
}) {
  const [tapValue, setTapValue] = useState<QmkKeycode>(
    props.keycodeconverter.getTapKeycode(props.keycode),
  );
  const [tapInputValue, setTapInputValue] = useState<string>(
    props.keycodeconverter.getTapKeycode(props.keycode).label,
  );
  const [holdValue, setHoldValue] = useState<QmkKeycode>(
    props.keycodeconverter.getHoldKeycode(props.keycode),
  );
  const [holdInputValue, setHoldInputValue] = useState<string>(
    props.keycodeconverter.getHoldKeycode(props.keycode).label,
  );
  const [modsValue, setModsValue] = useState<ModifierBits>(
    props.keycodeconverter.getModifier(props.keycode),
  );
  const [keycodeValue, setKeycodeValue] = useState<string>("");
  const popupRef = useRef<HTMLDivElement | null>(null);

  const filterOptions = (options: QmkKeycode[], { inputValue }: { inputValue: string }) =>
    matchSorter(options, inputValue, { keys: ["label", "key", "aliases.*"] });

  useEffect(() => {
    setTapValue(props.keycodeconverter.getTapKeycode(props.keycode));
    setTapInputValue(props.keycodeconverter.getTapKeycode(props.keycode).label);
    setHoldValue(props.keycodeconverter.getHoldKeycode(props.keycode));
    setHoldInputValue(props.keycodeconverter.getHoldKeycode(props.keycode).label);
    setModsValue(props.keycodeconverter.getModifier(props.keycode));
    setKeycodeValue("0x" + ((props.keycode.value ?? 0).toString(16).toUpperCase().padStart(2, "0")));
  }, [props.keycode]);

  return (
    <ClickAwayListener
      mouseEvent="onMouseUp"
      touchEvent="onTouchEnd"
      onClickAway={(e) => {
        if (props.anchor?.contains(e.target as Node)) return;
        if (!(e.target as HTMLElement).className.includes("keycode-catalog-tab")) {
          props.onClickAway?.();
        }
      }}
    >
      <Popper
        open={props.open}
        anchorEl={props.anchor}
        placement="auto-start"
        disablePortal={false}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
        modifiers={[
          {
            name: "preventOverflow",
            options: { boundary: props.boundary || document.body, padding: 8 },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["top-start", "top-end", "bottom-start", "bottom-end"],
              boundary: props.boundary || document.body,
            },
          },
        ]}
      >
        <div className="key-select-popup" ref={popupRef}>
          <Autocomplete
            value={tapValue}
            filterOptions={filterOptions}
            onChange={(_event, newValue) => {
              setTapValue(newValue ?? DefaultQmkKeycode);
              const newKeycode = props.keycodeconverter.combineKeycodes(
                newValue ?? DefaultQmkKeycode,
                holdValue,
                modsValue,
              ) ?? DefaultQmkKeycode;
              setKeycodeValue("0x" + (newKeycode.value.toString(16).toUpperCase().padStart(2, "0")));
              props.onChange?.({ keymapkey: props.keymapKey, keycode: newKeycode });
            }}
            inputValue={tapInputValue}
            onInputChange={(_event, newInputValue) => setTapInputValue(newInputValue)}
            options={props.keycodeconverter.getTapKeycodeList()}
            isOptionEqualToValue={(option, value) => option.value == value.value}
            getOptionKey={(option) => option.key}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => <TextField {...params} label="Base(Tap)" />}
            renderOption={(optionProps, option) => (
              <Box component="li" {...optionProps}>
                <div className="list-label">{option.label}</div>
                <div className="list-key">{option.key}</div>
              </Box>
            )}
            ListboxProps={{ style: { maxHeight: "200px" } }}
            slotProps={{ popper: { container: popupRef.current } }}
          />

          <Autocomplete
            value={holdValue}
            filterOptions={filterOptions}
            onChange={(_event, newValue) => {
              setHoldValue(newValue ?? DefaultQmkKeycode);
              const newKeycode = props.keycodeconverter.combineKeycodes(
                tapValue,
                newValue ?? DefaultQmkKeycode,
                modsValue,
              ) ?? DefaultQmkKeycode;
              setKeycodeValue("0x" + (newKeycode.value.toString(16).toUpperCase().padStart(2, "0")));
              props.onChange?.({ keymapkey: props.keymapKey, keycode: newKeycode });
            }}
            inputValue={holdInputValue}
            onInputChange={(_event, newInputValue) => setHoldInputValue(newInputValue)}
            options={props.keycodeconverter.getHoldKeycodeList()}
            isOptionEqualToValue={(option, value) => option.value == value.value}
            getOptionKey={(option) => option.key}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => <TextField {...params} label="Option(Hold)" />}
            renderOption={(optionProps, option) => (
              <Box component="li" {...optionProps}>
                <div className="list-label">{option.label}</div>
                <div className="list-key">{option.key}</div>
              </Box>
            )}
            ListboxProps={{ style: { maxHeight: "200px" } }}
            slotProps={{ popper: { container: popupRef.current } }}
          />

          <FormGroup row>
            {(
              [
                { Ctrl: ModifierBit.Ctrl },
                { Shift: ModifierBit.Shift },
                { Alt: ModifierBit.Alt },
                { GUI: ModifierBit.GUI },
                { UseRight: ModifierBit.UseRight },
              ] as { [key: string]: ModifierBit }[]
            ).map((modifier, idx) => (
              <FormControlLabel
                key={idx}
                value={Object.keys(modifier)[0]}
                sx={{ mt: 1, mb: 1, ml: 0, mr: 0 }}
                control={
                  <Checkbox
                    checked={(modsValue & Object.values(modifier)[0]) !== 0}
                    onChange={(event) => {
                      const newMods = event.target.checked
                        ? modsValue | Object.values(modifier)[0]
                        : modsValue & ~Object.values(modifier)[0];
                      setModsValue(newMods);
                      const newKeycode = props.keycodeconverter.combineKeycodes(tapValue, holdValue, newMods) ?? DefaultQmkKeycode;
                      setKeycodeValue("0x" + (newKeycode.value.toString(16).toUpperCase().padStart(2, "0")));
                      props.onChange?.({ keymapkey: props.keymapKey, keycode: newKeycode });
                    }}
                    size="small"
                  />
                }
                label={<Typography sx={{ fontSize: "0.8rem" }}>{Object.keys(modifier)[0]}</Typography>}
                labelPlacement="top"
              />
            ))}
          </FormGroup>

          <TextField
            label="Keycode(hex)"
            variant="outlined"
            value={keycodeValue}
            onChange={(event) => {
              const value = event.target.value;
              setKeycodeValue(value);
              let parsed = NaN;
              try {
                parsed = Number.parseInt(value.replace(/^0x/i, ""), 16);
              } catch {
                parsed = NaN;
              }
              if (!Number.isNaN(parsed) && 0 <= parsed && parsed <= 0xffff) {
                const keycode = props.keycodeconverter.convertIntToKeycode(parsed);
                setTapValue(props.keycodeconverter.getTapKeycode(keycode));
                setTapInputValue(props.keycodeconverter.getTapKeycode(keycode).label);
                setHoldValue(props.keycodeconverter.getHoldKeycode(keycode));
                setHoldInputValue(props.keycodeconverter.getHoldKeycode(keycode).label);
                setModsValue(props.keycodeconverter.getModifier(keycode));
                props.onChange?.({
                  keymapkey: props.keymapKey,
                  keycode: props.keycodeconverter.convertIntToKeycode(parsed),
                });
              }
            }}
          />
        </div>
      </Popper>
    </ClickAwayListener>
  );
}
