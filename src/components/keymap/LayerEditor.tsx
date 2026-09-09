import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { ViaKeyboard } from "../../services/vialKeyboad";
import { buildBluetoothShortcuts } from "../keymapLogic";
import { KeymapLayer } from "./KeymapLayer";
import { LayerSelector, LayoutSelector } from "./LayerControls";
import { KeycodeConverter, QmkKeycode } from "../keycodes/keycodeConverter";
import { KeymapKeyProperties, KeymapProperties } from "../keymapTypes";

export function LayerEditor(props: {
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
  }, [keymap, encodermap, encoderCount, props.layerCount, props.keymap, props.via, props.keycodeConverter]);

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

      const matrixDefinition = {
        rows: props.keymap.matrix.rows,
        cols: props.keymap.matrix.cols,
      };
      const targetLayerToLoad = layer;
      const loadedLayers: { [layer: number]: number[] } = {};
      loadedLayers[targetLayerToLoad] = await props.via.GetLayer(targetLayerToLoad, matrixDefinition);
      setKeymap((prev) => ({ ...prev, ...loadedLayers }));

      const encoderEntries = props.keymap.layouts.keymap
        .flatMap((row) => row)
        .filter((col): col is string => typeof col === "string" && /(?:^|\n)e\s*$/.test(col));
      const calculatedEncoderCount = encoderEntries.reduce((count, encoder) => {
        const encoderIndex = Number.parseInt(encoder.split(/\r?\n/)[0].split(",")[0], 10);
        return Number.isInteger(encoderIndex) ? Math.max(count, encoderIndex + 1) : count;
      }, 0);
      setEncoderCount(calculatedEncoderCount);
      const loadedEncoders: { [layer: number]: number[][] } = {};
      loadedEncoders[targetLayerToLoad] = await props.via.GetEncoder(targetLayerToLoad, calculatedEncoderCount);
      setEncodermap((prev) => ({ ...prev, ...loadedEncoders }));
      setKeymapAnimationToken((token) => token + 1);
    });
  }, [props.keymap, props.layerCount, props.via, keymapReloadToken, layer]);

  const sendKeycode = async (targetLayer: number, row: number, col: number, keycode: number) => {
    await props.via.SetKeycode(targetLayer, row, col, keycode);
  };

  const sendEncoder = async (targetLayer: number, index: number, direction: number, keycode: number) => {
    await props.via.SetEncoder([{ layer: targetLayer, index, direction, keycode }]);
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
          onChange={async (targetLayer) => {
            if (!Object.keys(keymap).includes(targetLayer.toString())) {
              const matrixDefinition = {
                rows: props.keymap.matrix.rows,
                cols: props.keymap.matrix.cols,
              };
              const layerKeys = await props.via.GetLayer(targetLayer, matrixDefinition);
              const newKeymap = { ...keymap };
              newKeymap[targetLayer] = layerKeys;
              setKeymap(newKeymap);
              console.log(`load keymap ${targetLayer}`);
              console.log(layerKeys.map((keycode) => keycode.toString(16)).join(" "));

              const layerEncoders = await props.via.GetEncoder(targetLayer, encoderCount);
              setEncodermap({ ...encodermap, [targetLayer]: layerEncoders });
            }
            setLayer(targetLayer);
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
            onKeycodeChange={(target: KeymapKeyProperties, newKeycode: QmkKeycode) => {
              if (target.isEncoder) {
                const newencoder = { ...encodermap };
                newencoder[layer][target.matrix[0]] =
                  target.matrix[1] == 0
                    ? [newKeycode.value, encodermap[layer][target.matrix[0]][1]]
                    : [encodermap[layer][target.matrix[0]][0], newKeycode.value];
                setEncodermap(newencoder);
                void sendEncoder(layer, target.matrix[0], target.matrix[1], newKeycode.value);
                console.log(`update encoder`);
              } else {
                const offset = props.keymap.matrix.cols * target.matrix[0] + target.matrix[1];

                if (keymap[layer][offset] == newKeycode.value) {
                  return;
                }

                const newKeymap = { ...keymap };
                newKeymap[layer][offset] = newKeycode.value;
                setKeymap(newKeymap);
                void sendKeycode(layer, target.matrix[0], target.matrix[1], newKeycode.value);
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
