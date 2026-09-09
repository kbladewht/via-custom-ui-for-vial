import { Box, Button, FormControl, Grid, MenuItem, Select } from "@mui/material";
import { useContext, useEffect, useRef, useState } from "react";
import "../App.css";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { ComboEditor } from "./ComboEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import {
  discardPendingKeycapAudio,
  playKeycapLandingSound,
  prepareKeycapAudio,
} from "./keycapAudio";
import { buildBluetoothShortcuts, convertToKeymapKeys } from "./keymapLogic";
import { KeymapKeyPopUp } from "./KeymapKeyPopUp";
import {
  FocusedKeyContext,
  KeymapKeyProperties,
  KeymapProperties,
  KEY_GAP,
  WIDTH_1U,
} from "./keymapTypes";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  QmkKeycode,
} from "./keycodes/keycodeConverter";
import { OverrideEditor } from "./OverrideEditor";
import { TapDanceEditor } from "./TapDanceEditor";

export {
  discardPendingKeycapAudio,
  prepareKeycapAudio,
  FocusedKeyContext,
  KEY_GAP,
  WIDTH_1U,
};
export { KeymapKeyPopUp } from "./KeymapKeyPopUp";
export type { KeymapKeyProperties, KeymapProperties } from "./keymapTypes";

function KeyLegend(props: { keycode: QmkKeycode }) {
  const { keycode } = props;
  if (!keycode.modLabel && !keycode.holdLabel) {
    return (
      <div className={`key-legend-centered ${keycode.label === "▽" ? "key-legend-symbol" : ""}`}>
        {keycode.label}
      </div>
    );
  }

  return (
    <Grid container direction="column" className="legend-container">
      <Grid item xs={3.5}>
        <div className="mod-legend">{keycode.modLabel ?? ""}</div>
      </Grid>
      <Grid item xs={5}>
        <div className="main-legend">{keycode.label}</div>
      </Grid>
      <Grid item xs={3.5}>
        <div className="hold-legend">{keycode.holdLabel ?? ""}</div>
      </Grid>
    </Grid>
  );
}

export function EditableKey(props: {
  keycode: QmkKeycode;
  onKeycodeChange?: (newKeycode: QmkKeycode) => void;
  onClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      className={`keymap-key ${isDragOver && "drag-over"}`}
      style={{
        width: WIDTH_1U,
        height: WIDTH_1U,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget, event.ctrlKey)}
    >
      <KeyLegend keycode={props.keycode} />
    </div>
  );
}

export function KeymapKey(props: KeymapKeyProperties & { isFocused?: boolean }) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      key={props.reactKey}
      className={`keymap-key ${props.isEncoder && "keymap-encoder"} ${isDragOver && "drag-over"} ${props.isFocused && "keymap-key-focused"}`}
      style={
        props.r != 0
          ? {
              position: "absolute",
              top: (props.ry + props.offsety) * (WIDTH_1U + KEY_GAP),
              left: (props.rx + props.offsetx) * (WIDTH_1U + KEY_GAP),
              width: props.w * WIDTH_1U - 4 + (props.w - 1) * KEY_GAP,
              height: props.h * WIDTH_1U - 4,
              transform: "var(--keymap-rotation)",
              "--keymap-rotation": `rotate(${props.r}deg)`,
              animationDelay:
                props.animationDelay !== undefined
                  ? `${props.animationDelay}ms`
                  : undefined,
              transformOrigin: `${-props.offsetx * (WIDTH_1U + KEY_GAP)}px ${-props.offsety * (WIDTH_1U + KEY_GAP)}px`,
            } as React.CSSProperties
          : {
              position: "absolute",
              top: props.y * (WIDTH_1U + KEY_GAP),
              left: props.x * (WIDTH_1U + KEY_GAP),
              width: props.w * WIDTH_1U - 4 + (props.w - 1) * KEY_GAP,
              height: props.h * WIDTH_1U - 4,
              transform: "var(--keymap-rotation)",
              "--keymap-rotation": "rotate(0deg)",
              animationDelay:
                props.animationDelay !== undefined
                  ? `${props.animationDelay}ms`
                  : undefined,
            } as React.CSSProperties
      }
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(props, keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget, event.ctrlKey)}
      title={props.shortcut}
    >
      <KeyLegend keycode={props.keycode} />
    </div>
  );
}

function LayoutSelector(props: {
  layouts: {
    labels?: string[][];
    keymap: (string | object)[][];
  };
  option: { [layout: number]: number };
  onChange: (option: { [layout: number]: number }) => void;
}) {
  const labels = props.layouts.labels?.[0]?.slice(1) ?? [];
  const layoutCount = props.layouts.keymap
    .flatMap((row) => row)
    .reduce((count, key) => {
      if (typeof key !== "string") return count;
      const layout = Number(key.split("\n")[3]?.split(",")[1]);
      return Number.isInteger(layout) ? Math.max(count, layout + 1) : count;
    }, 1);
  const options = labels.length > 0
    ? labels
    : layoutCount === 2
      ? ["P40", "HHKB"]
      : [...Array(layoutCount)].map((_, index) => `Layout ${index}`);

  if (options.length < 2) {
    return null;
  }

  return (
    <Select
      variant="standard"
      value={props.option[0] ?? 0}
      label="layout"
      sx={{ width: "max-content", minWidth: 0, mt: 1, mb: 1, fontSize: "10px" }}
      onChange={(event) => {
        props.onChange({ 0: Number(event.target.value) });
      }}
    >
      {options.map((label, index) => (
        <MenuItem key={label} value={index} sx={{ fontSize: "10px" }}>
          {label}
        </MenuItem>
      ))}
    </Select>
  );
}

function LayerSelector(props: {
  layerCount: number;
  currentLayer?: number;
  onChange: (layer: number) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 1,
        mb: 2,
        mt: 1,
        maxWidth: "100%",
        overflowX: "never",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          color: "#b8c7dc",
          fontSize: "0.8rem",
          fontWeight: 600,
        }}
      >
        Layer
      </Box>
      {[...Array(props.layerCount)].map((_, idx) => {
        const isActive = props.currentLayer === idx;
        return (
          <Button
            key={idx}
            value={idx}
            variant="outlined"
            size="small"
            sx={{
              minWidth: "36px",
              flexShrink: 0,
              color: isActive ? "#e5eefb" : "#8fa4bd",
              borderColor: isActive ? "#596777" : "#294b70",
              backgroundColor: isActive ? "#3f4b5a" : "#111d2d",
              "&:hover": {
                borderColor: "#596777",
                backgroundColor: "#2d3d4f",
              },
            }}
            onClick={() => {
              props.onChange(idx);
            }}
          >
            {idx}
          </Button>
        );
      })}
    </Box>
  );
}

function KeymapLayer(props: {
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
  // Access the global focus context
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
  // Keep a live reference so callbacks created in past renders still see the latest keys.
  const keymapkeysRef = useRef(keymapkeys);
  keymapkeysRef.current = keymapkeys;

  // Calculate the rightmost position to determine needed width
  const rightmostPos =
    Math.max(...keymapkeys.map((key) => key.x + key.w)) * (WIDTH_1U + KEY_GAP) + WIDTH_1U;

  // Move focus to the next key in tab order after a keycode is assigned from the catalog.
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

  // Update context when local focused key changes
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
          width: `${rightmostPos}px`, // Set explicit width based on rightmost key plus padding
          minWidth: "100%", // Ensure it's at least as wide as the container
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
              // Only pop up the tap/hold editor when Ctrl is held; a plain click just focuses the key.
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
            setFocusedKey(undefined); // Clear focus when closing popup
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

function LayerEditor(props: {
  keymap: KeymapProperties;
  via: ViaKeyboard;
  layerCount: number;
  keycodeConverter: KeycodeConverter;
  dynamicEntryCount: { tapdance: number };
  onTapdanceSelect?: (index: number) => void;
  onMacroSelect?: (index: number) => void;
}) {
  const [layoutOption, setLayoutOption] = useState<{
    [layout: number]: number;
  }>({ 0: 0 });
  const [layer, setLayer] = useState(0);
  const [keymap, setKeymap] = useState<{ [layer: number]: number[] }>({});
  const [encoderCount, setEncoderCount] = useState(0);
  const [encodermap, setEncodermap] = useState<{ [layer: number]: number[][] }>({});
  const [keymapReloadToken, setKeymapReloadToken] = useState(0);
  const [keymapAnimationToken, setKeymapAnimationToken] = useState(0);
  const shortcutByKeycode: { [keycode: number]: string } = {};

  useEffect(() => {
    const loadMissingShortcutLayers = async () => {
      const layersToLoad = Math.min(3, props.layerCount);
      const missingLayers = [...Array(layersToLoad)]
        .map((_, index) => index)
        .filter((index) => keymap[index] === undefined);

      if (missingLayers.length === 0) return;

      const matrixDefinition = {
        rows: props.keymap.matrix.rows,
        cols: props.keymap.matrix.cols,
      };
      const loadedKeymap = { ...keymap };
      const loadedEncodermap = { ...encodermap };
      for (const missingLayer of missingLayers) {
        loadedKeymap[missingLayer] = await props.via.GetLayer(missingLayer, matrixDefinition, true);
        loadedEncodermap[missingLayer] = await props.via.GetEncoder(missingLayer, encoderCount, true);
        setKeymap({ ...loadedKeymap });
        setEncodermap({ ...loadedEncodermap });
      }
    };

    const handleShortcutHelpRequest = async () => {
      await loadMissingShortcutLayers();
      // compute shortcuts only when user explicitly requests
      const shortcutInfo = buildBluetoothShortcuts(
        { ...keymap },
        props.keymap.customKeycodes,
        props.keycodeConverter,
        props.keymap.matrix.cols,
      );
      window.dispatchEvent(new CustomEvent("vial-shortcut-help", { detail: shortcutInfo.entries }));
    };
    window.addEventListener("vial-shortcut-help-request", handleShortcutHelpRequest);
    return () => window.removeEventListener("vial-shortcut-help-request", handleShortcutHelpRequest);
  }, [keymap, encodermap, encoderCount, props.layerCount, props.keymap, props.via]);

  useEffect(() => {
    const reloadKeymap = () => setKeymapReloadToken((token) => token + 1);
    window.addEventListener("vial-reload-keymap", reloadKeymap);
    return () => window.removeEventListener("vial-reload-keymap", reloadKeymap);
  }, []);

  useEffect(() => {
    if (props.layerCount <= 0) return;

    navigator.locks.request("load-layout", async () => {
      const refreshOnly = keymapReloadToken > 0;
      if (!refreshOnly) {
        const layout = await props.via.GetLayoutOption();
        setLayoutOption({ 0: layout });
        setLayer(0);
      }

      // only load the currently selected layer by default to avoid excessive requests
      const matrixDefinition = {
        rows: props.keymap.matrix.rows,
        cols: props.keymap.matrix.cols,
      };
      const targetLayerToLoad = layer; // current selected layer state
      const loadedLayers: { [layer: number]: number[] } = {};
      loadedLayers[targetLayerToLoad] = await props.via.GetLayer(targetLayerToLoad, matrixDefinition);
      setKeymap((prev) => ({ ...prev, ...loadedLayers }));

      const encoderEntries = props.keymap.layouts.keymap
        .flatMap((row) => row)
        .filter((col): col is string => typeof col === "string" && /(?:^|\n)e\s*$/.test(col));
      const encoderCount = encoderEntries.reduce((count, encoder) => {
        const encoderIndex = Number.parseInt(encoder.split(/\r?\n/)[0].split(",")[0], 10);
        return Number.isInteger(encoderIndex) ? Math.max(count, encoderIndex + 1) : count;
      }, 0);
      setEncoderCount(encoderCount);
      const loadedEncoders: { [layer: number]: number[][] } = {};
      loadedEncoders[targetLayerToLoad] = await props.via.GetEncoder(targetLayerToLoad, encoderCount);
      setEncodermap((prev) => ({ ...prev, ...loadedEncoders }));
      setKeymapAnimationToken((token) => token + 1);
    });
  }, [props.keymap, props.layerCount, props.via, keymapReloadToken]);

  const sendKeycode = async (layer: number, row: number, col: number, keycode: number) => {
    await props.via.SetKeycode(layer, row, col, keycode);
  };

  const sendEncoder = async (layer: number, index: number, direction: number, keycode: number) => {
    await props.via.SetEncoder([{ layer, index, direction, keycode }]);
  };

  const sendLayout = async (layout: number) => {
    await props.via.SetLayoutOption(layout);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
          width: "100%",
          overflowX: "auto",
        }}
      >
        <LayoutSelector
          layouts={props.keymap.layouts}
          option={layoutOption}
          onChange={(option) => {
            setLayoutOption(option);
            void sendLayout(option[0]);
          }}
        />
        <LayerSelector
          layerCount={props.layerCount}
          currentLayer={layer}
          onChange={async (layer) => {
            if (!Object.keys(keymap).includes(layer.toString())) {
              const matrixDefinition = {
                rows: props.keymap.matrix.rows,
                cols: props.keymap.matrix.cols,
              };
              const layerKeys = await props.via.GetLayer(layer, matrixDefinition);
              const newKeymap = { ...keymap };
              newKeymap[layer] = layerKeys;
              setKeymap(newKeymap);
              console.log(`load keymap ${layer}`);
              console.log(layerKeys.map((keycode) => keycode.toString(16)).join(" "));

              const layerEncoders = await props.via.GetEncoder(layer, encoderCount);
              setEncodermap({ ...encodermap, [layer]: layerEncoders });
            }
            setLayer(layer);
          }}
        ></LayerSelector>
      </Box>

      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          pl: 1,
          pr: 5,
          display: "flex",
          justifyContent: "center",
          /* hide scrollbars but allow scrolling */
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        }}
      >
        {props.layerCount > 0 && keymap[layer] !== undefined ? (
          <KeymapLayer
            key={`keymap-${keymapAnimationToken}`}
            keymapReady
            keymapProps={props.keymap}
            layoutOption={layoutOption}
            keymap={keymap[layer]}
            encodermap={encodermap[layer] ?? []}
            keycodeconverter={props.keycodeConverter}
            shortcutByKeycode={shortcutByKeycode}
            onKeycodeChange={(target, newKeycode) => {
              if (target.isEncoder) {
                const newencoder = { ...encodermap };
                newencoder[layer][target.matrix[0]] =
                  target.matrix[1] == 0
                    ? [newKeycode.value, encodermap[layer][target.matrix[0]][1]]
                    : [encodermap[layer][target.matrix[0]][0], newKeycode.value];
                setEncodermap(newencoder);
                sendEncoder(layer, target.matrix[0], target.matrix[1], newKeycode.value);
                console.log(`update encoder`);
              } else {
                const offset = props.keymap.matrix.cols * target.matrix[0] + target.matrix[1];

                if (keymap[layer][offset] == newKeycode.value) {
                  return;
                }

                const newKeymap = { ...keymap };
                newKeymap[layer][offset] = newKeycode.value;
                setKeymap(newKeymap);
                sendKeycode(layer, target.matrix[0], target.matrix[1], newKeycode.value);
                console.log(
                  `update ${layer},${target.matrix[0]},${target.matrix[1]} to ${newKeycode.value}`,
                );
              }
            }}
          ></KeymapLayer>
        ) : (
          <></>
        )}
      </Box>
    </>
  );
}

export function LanguageSelector(props: {
  languageList: string[];
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <FormControl variant="standard">
      <Select
        value={props.lang}
        label="language"
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.languageList.map((label) => (
          <MenuItem key={label} value={label}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function ComboOverrideEditor(props: {
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage: string;
  dynamicEntryCount: { combo: number; override: number; layer: number; tapdance: number };
}) {
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [editor, setEditor] = useState<"combo" | "override">();
  const [comboIndex, setComboIndex] = useState(-1);
  const [overrideIndex, setOverrideIndex] = useState(-1);

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
    <Box sx={{ width: "100%", p: 1 }}>
      {editor === "combo" ? (
        <ComboEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          comboIndex={comboIndex}
          comboCount={props.dynamicEntryCount.combo}
          onBack={() => setEditor(undefined)}
        />
      ) : editor === "override" ? (
        <OverrideEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          overrideIndex={overrideIndex}
          overrideCount={props.dynamicEntryCount.override}
          onBack={() => setEditor(undefined)}
        />
      ) : (
        <KeycodeCatalog
          keycodeConverter={keycodeConverter}
          directKeygroups={["combo", "keyoverride"]}
          showComboOverrideEditIndicator
          comboCount={props.dynamicEntryCount.combo}
          overrideCount={props.dynamicEntryCount.override}
          onComoboSelect={(index) => {
            setComboIndex(index);
            setEditor("combo");
          }}
          onOverrideSelect={(index) => {
            setOverrideIndex(index);
            setEditor("override");
          }}
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
  const [editorIndex, setEditorIndex] = useState<number>();

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
    <Box sx={{ width: "100%", p: 1 }}>
      {editorIndex === undefined ? (
        <KeycodeCatalog
          keycodeConverter={keycodeConverter}
          directKeygroups={["tapdance"]}
          showTapDanceEditIndicator
          onTapdanceSelect={(index) => setEditorIndex(index)}
        />
      ) : (
        <TapDanceEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          tapdanceIndex={editorIndex}
          onBack={() => setEditorIndex(undefined)}
        />
      )}
    </Box>
  );
}

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

  // State for the focused key context
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

