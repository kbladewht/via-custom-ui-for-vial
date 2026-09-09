import { createContext } from "react";
import { QmkKeycode } from "./keycodes/keycodeConverter";

export interface FocusedKeyContextType {
  focusedKey: KeymapKeyProperties | null;
  setFocusedKey: (focusedKey: KeymapKeyProperties | null) => void;
  onKeycodeChange?: (target: KeymapKeyProperties, newKeycode: QmkKeycode) => void;
}

export const FocusedKeyContext = createContext<FocusedKeyContextType>({
  focusedKey: null,
  setFocusedKey: () => {},
});

export interface KeymapProperties {
  matrix: { rows: number; cols: number };
  layouts: {
    labels?: string[][];
    keymap: (
      | string
      | {
          x?: number;
          y?: number;
          r?: number;
          rx?: number;
          ry?: number;
          w?: number;
          h?: number;
        }
    )[][];
  };
  customKeycodes?: { name: string; title: string; shortName: string }[];
}

export interface KeymapKeyProperties {
  matrix: number[];
  x: number;
  y: number;
  offsetx: number;
  offsety: number;
  r: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
  layout: number[];
  keycode: QmkKeycode;
  shortcut?: string;
  reactKey: string;
  animationDelay?: number;
  isEncoder?: boolean;
  onKeycodeChange?: (target: KeymapKeyProperties, newKeycode: QmkKeycode) => void;
  onClick?: (target: HTMLElement, ctrlKey: boolean) => void;
}

export const KEY_GAP = 2;
export const WIDTH_1U = 50;
