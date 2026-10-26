import { match, P } from "ts-pattern";
import { KeycodeConverter } from "../keycodes/keycodeConverter";
import {
  KEY_GAP,
  KeymapKeyProperties,
  KeymapProperties,
  WIDTH_1U,
} from "./keymapTypes";

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
  let clusterX = 0;
  let clusterY = 0;

  const keys: KeymapKeyProperties[] = [];
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
            const keycode = keycodeconverter.convertIntToKeycode(
              isEncoder
                ? (encodermap?.[keyPos[0]]?.[keyPos[1]] ?? 0)
                : (keymap[keyPos[1] + keyPos[0] * props.matrix.cols] ?? 0),
            );
            keys.push({
              ...current,
              offsetx: current.r ? current.x - current.rx : 0,
              offsety: current.r ? current.y - current.ry : 0,
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
          if (col.r !== undefined) current.r = col.r;
          if (col.rx !== undefined) {
            current.rx = clusterX = col.rx;
            current.x = clusterX;
            current.y = clusterY;
          }
          if (col.ry !== undefined) {
            current.ry = clusterY = col.ry;
            current.x = clusterX;
            current.y = clusterY;
          }
          current = {
            ...current,
            ...col,
            x: current.x + (col.x ?? 0),
            y: current.y + (col.y ?? 0),
          };
        });
    }
    current.y += 1;
    current.x = current.rx;
    current.w = 1;
    current.h = 1;
  }
  return keys;
}

export function normalizeKeymapKeys(keys: KeymapKeyProperties[]) {
  const unit = WIDTH_1U + KEY_GAP;
  const bounds = keys.reduce(
    (result, key) => {
      const width = key.w * WIDTH_1U - 4 + (key.w - 1) * KEY_GAP;
      const height = key.h * WIDTH_1U - 4;

      if (key.r === 0) {
        result.minX = Math.min(result.minX, key.x * unit);
        result.minY = Math.min(result.minY, key.y * unit);
        result.maxX = Math.max(result.maxX, key.x * unit + width);
        result.maxY = Math.max(result.maxY, key.y * unit + height);
        return result;
      }

      const radians = key.r * Math.PI / 180;
      const cosine = Math.cos(radians);
      const sine = Math.sin(radians);
      const pivotX = key.rx * unit;
      const pivotY = key.ry * unit;
      const left = key.offsetx * unit;
      const top = key.offsety * unit;
      const corners = [
        [left, top],
        [left + width, top],
        [left, top + height],
        [left + width, top + height],
      ];

      for (const [x, y] of corners) {
        const rotatedX = pivotX + x * cosine - y * sine;
        const rotatedY = pivotY + x * sine + y * cosine;
        result.minX = Math.min(result.minX, rotatedX);
        result.minY = Math.min(result.minY, rotatedY);
        result.maxX = Math.max(result.maxX, rotatedX);
        result.maxY = Math.max(result.maxY, rotatedY);
      }
      return result;
    },
    {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    },
  );

  if (keys.length === 0) {
    return { keys, width: 0, height: 0 };
  }

  return {
    keys: keys.map((key) =>
      key.r === 0
        ? {
            ...key,
            x: key.x - bounds.minX / unit,
            y: key.y - bounds.minY / unit,
          }
        : {
            ...key,
            rx: key.rx - bounds.minX / unit,
            ry: key.ry - bounds.minY / unit,
          },
    ),
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
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
