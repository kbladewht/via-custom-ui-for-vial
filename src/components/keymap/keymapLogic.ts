import { match, P } from "ts-pattern";
import { KeycodeConverter } from "../keycodes/keycodeConverter";
import { KeymapKeyProperties, KeymapProperties } from "./keymapTypes";

export function convertToKeymapKeys(
  props: KeymapProperties,
  layoutOptions: { [layout: number]: number },
  keymap: number[],
  encodermap: number[][],
  keycodeconverter: KeycodeConverter,
  shortcutByKeycode: { [keycode: number]: string },
): KeymapKeyProperties[] {
  let current = {
    x: 0,
    y: 0,
    offsetx: 0,
    offsety: 0,
    r: 0,
    rx: 0,
    ry: 0,
    w: 1,
    h: 1,
  };

  const keys: KeymapKeyProperties[] = [];
  let firstKey = true;
  for (const row of props.layouts.keymap) {
    for (const col of row) {
      match(col)
        .with(P.string, (col) => {
          const layout = col
            .split("\n")[3]
            ?.split(",")
            ?.map((s) => parseInt(s));

          const keyPos = col
            .split("\n")[0]
            .split(",")
            .map((v) => parseInt(v))
            .slice(0, 2);
          const hasMatrixPosition = keyPos.length === 2 && keyPos.every(Number.isInteger);

          const lines = col.split("\n");
          const isEncoder = lines[lines.length - 1]?.trim() === "e";

          if (
            hasMatrixPosition &&
            ((layout?.length ?? 0) < 2 || layoutOptions[layout[0]] == layout[1])
          ) {
            if (firstKey) {
              firstKey = false;
              current.y = 0;
            }
            const keycode = keycodeconverter.convertIntToKeycode(
              isEncoder
                ? (encodermap?.[keyPos[0]]?.[keyPos[1]] ?? 0)
                : (keymap[keyPos[1] + keyPos[0] * props.matrix.cols] ?? 0),
            );
            keys.push({
              ...current,
              matrix: keyPos,
              layout: [],
              keycode,
              shortcut: shortcutByKeycode[keycode.value],
              isEncoder: isEncoder,
              reactKey: "",
            });
          }

          if ((layout?.length ?? 0) < 2 || layoutOptions[layout[0]] == layout[1]) {
            current.x += current.w;
            current.w = 1;
            current.h = 1;
          }
        })
        .with(P._, (col) => {
          current = {
            ...current,
            ...col,
            x: current.x + (col.r ? 0 : (col.x ?? 0)),
            y: current.y + (col.r ? 0 : (col.y ?? 0)),
            offsetx: col.r ? (col.x ?? 0) : 0,
            offsety: col.r ? (col.y ?? 0) : 0,
          };
        });
    }
    current.x = 0;
    current.y += 1;
    current.y = current.r ? 0 : current.y;
    current.w = 1;
    current.h = 1;
  }
  return keys;
}

export function buildBluetoothShortcuts(
  keymaps: { [layer: number]: number[] },
  customKeycodes: { name: string; title: string; shortName: string }[] | undefined,
  keycodeconverter: KeycodeConverter,
  matrixCols: number,
) {
  const shortcuts: { [keycode: number]: string } = {};
  const entries: { name: string; label: string; shortcut: string }[] = [];
  console.groupCollapsed("[BLE shortcut] scan");
  console.log("layers:", Object.keys(keymaps));
  console.log("keymap sizes:", Object.fromEntries(Object.entries(keymaps).map(([layer, values]) => [layer, values.length])));
  const bluetoothKeycodes = keycodeconverter
    .getTapKeycodeList()
    .filter((keycode) =>
      customKeycodes?.some((custom) => {
        const name = custom.name.trim();
        return custom.name === keycode.key &&
          (name.startsWith("BLE_") || name.includes("2.4G"));
      }),
    );
  console.log(
    "candidates:",
    bluetoothKeycodes.map((keycode) => ({ key: keycode.key, value: `0x${keycode.value.toString(16)}`, label: keycode.label })),
  );
  for (const bluetoothKeycode of bluetoothKeycodes) {
    let targetLayer = -1;
    let targetIndex = -1;
    for (let layer = 2; layer >= 0; layer--) {
      const index = keymaps[layer]?.indexOf(bluetoothKeycode.value) ?? -1;
      if (index >= 0) {
        targetLayer = layer;
        targetIndex = index;
        break;
      }
    }

    if (targetLayer < 0) {
      console.warn(`[BLE shortcut] ${bluetoothKeycode.key} not found in loaded layers`);
      continue;
    }

    console.log(
      `[BLE shortcut] ${bluetoothKeycode.key} target: layer ${targetLayer}, ` +
        `R${Math.floor(targetIndex / matrixCols)} C${targetIndex % matrixCols}`,
    );
    const parts: string[] = [];
    const hasDirectBaseTransition = targetLayer > 1 && (keymaps[0] ?? []).some((value) => {
      const keycode = keycodeconverter.convertIntToKeycode(value);
      return keycode.hold === targetLayer ||
        keycode.label === `MO${targetLayer}` ||
        keycode.key === `MO(${targetLayer})`;
    });
    for (let layer = targetLayer; layer > 0; layer--) {
      const previousKeymap = keymaps[layer - 1] ?? [];
      const transitionIndex = previousKeymap?.findIndex((value) => {
        const keycode = keycodeconverter.convertIntToKeycode(value);
        return keycode.hold === layer || keycode.label === `MO${layer}`;
      }) ?? -1;
      const transition = transitionIndex >= 0
        ? keycodeconverter.convertIntToKeycode(previousKeymap![transitionIndex])
        : undefined;
      const baseTransitionKeycode = layer > 1 && transitionIndex >= 0
        ? keymaps[0]?.[transitionIndex]
        : undefined;
      const baseTransitionLabel = baseTransitionKeycode === undefined
        ? undefined
        : keycodeconverter.convertIntToKeycode(baseTransitionKeycode).label;

      const transitionText = layer > 1 && baseTransitionLabel
        ? baseTransitionLabel
        : transition?.hold === layer
          ? `${transition.label || transition.key} (MO${layer})`
          : `MO(${layer})`;
      console.log(
        `[BLE shortcut] enter layer ${layer}:`,
        transition ?? "not found, fallback",
        transitionText,
      );
      if (hasDirectBaseTransition && layer < targetLayer) {
        continue;
      }
      parts.unshift(transitionText);
    }

    const baseKeycode = keymaps[0]?.[targetIndex];
    const baseKeyLabel = baseKeycode === undefined
      ? undefined
      : keycodeconverter.convertIntToKeycode(baseKeycode).label;
    parts.push(baseKeyLabel || bluetoothKeycode.label || bluetoothKeycode.key);
    const shortcut = parts.join(" + ");
    shortcuts[bluetoothKeycode.value] = shortcut;
    console.log(`[BLE shortcut] result ${bluetoothKeycode.key}: ${shortcut}`);
    const custom = customKeycodes?.find((item) => item.name === bluetoothKeycode.key);
    if (custom) {
      entries.push({ name: custom.name.trim(), label: custom.shortName, shortcut });
    }
  }
  console.log("entries:", entries);
  console.groupEnd();

  return { byKeycode: shortcuts, entries };
}
