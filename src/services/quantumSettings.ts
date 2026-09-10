import { ViaKeyboard } from "./vialKeyboad";

export const QuantumSettingDefinition: {
  label: string;
  content: {
    type: string;
    label: string;
    bit?: number;
    content: (string | number)[];
    options?: (string | number)[] | (string | number)[][];
  }[];
}[] = [
  {
    label: "Magic",
    content: [
      {
        type: "checkbox-list",
        label: "Magic",
        content: ["id-magic", 21, 2],
        options: [
          ["Swap Caps Lock and Left Control", 0],
          ["Treat Caps Lock as Control", 1],
          ["Swap Left Alt and GUI", 2],
          ["Swap Right Alt and GUI", 3],
          ["Disable the GUI keys", 4],
          ["Swap ` and Escape", 5],
          ["Swap \\ and Backspace", 6],
          ["Enable N-key rollover", 7],
          ["Swap Left Control and GUI", 8],
          ["Swap Right Control and GUI", 9],
        ],
      },
    ],
  },
  {
    label: "Grave Escape",
    content: [
      {
        type: "checkbox-list",
        label: "Grave Escape Override",
        content: ["id-grave-escape", 1, 1],
        options: [
          ["Always send Escape if Alt is pressed", 0],
          ["Always send Escape if Control is pressed", 1],
          ["Always send Escape if GUI is pressed", 2],
          ["Always send Escape if Shift is pressed", 3],
        ],
      },
    ],
  },

  {
    label: "Tap-Hold",
    content: [
      {
        type: "number",
        label: "Tapping Term",
        content: ["id-tapping-term", 7, 2],
        options: [0, 5000],
      },
      {
        type: "bit-checkbox",
        label: "Permissive Hold",
        bit: 0,
        content: ["id-tapping", 8, 1],
      },
      {
        type: "bit-checkbox",
        label: "Hold On Other Key Press",
        bit: 1,
        content: ["id-tapping", 8, 1],
      },
      {
        type: "bit-checkbox",
        label: "Retro Tapping",
        bit: 3,
        content: ["id-tapping", 8, 1],
      },
      {
        type: "number",
        label: "Quick Tap Term",
        content: ["id-quick-tap-term", 22, 2],
        options: [0, 5000],
      },
      {
        type: "number",
        label: "Tap Code Delay",
        content: ["id-tap-code-delay", 18, 2],
        options: [0, 500],
      },
      {
        type: "number",
        label: "Tap Hold Caps Delay",
        content: ["id-tap-hold-caps-delay", 19, 2],
        options: [0, 500],
      },
      {
        type: "number",
        label: "Tapping Toggle",
        content: ["id-tapping-toggle", 20, 1],
        options: [0, 99],
      },
      {
        type: "bit-checkbox",
        label: "Chordal Hold",
        bit: 4,
        content: ["id-tapping", 8, 1],
      },
      {
        type: "number",
        label: "Flow Tap",
        content: ["id-flow-tap", 23, 2],
        options: [0, 5000],
      },
    ],
  },
  {
    label: "Auto Shift",
    content: [
      {
        type: "multiple-checkbox",
        label: "Auto Shift option",
        content: ["id-auto-shift", 3, 1],
        options: [
          "Enable",
          "Enable for modifiers",
          "No Auto Shift Special",
          "No Auto Shift Numeric",
          "No Auto Shift Alpha",
          "Enable keyrepeat",
          "Disable keyrepeat when timeout is exceeded",
        ],
      },
      {
        type: "range",
        label: "Auto Shift timeout",
        content: ["id-auto-shift-timeout", 4, 1],
        options: [0, 255],
      },
    ],
  },

  {
    label: "Combo",
    content: [
      {
        type: "range",
        label: "Combo term [ms]",
        content: ["id-combo-term", 2, 2],
        options: [0, 500],
      },
    ],
  },
  {
    label: "One Shot Keys",
    content: [
      {
        type: "range",
        label: "Tap toggle count",
        content: ["id-osk-tap-toggle", 5, 1],
        options: [0, 50],
      },
      {
        type: "range",
        label: "One shot key timeout [ms]",
        content: ["id-osk-tap-timeout", 6, 2],
        options: [0, 65535],
      },
    ],
  },
  /*
  {
    label: "Mouse Keys",
    content: [
      {
        type: "range",
        label: "Mouse key delay[ms]",
        content: ["id-mousekey-delay", 9, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key interval[ms]",
        content: ["id-mousekey-interval", 10, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key move delta",
        content: ["id-mousekey-move-delta", 11, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key max speed",
        content: ["id-mousekey-max-speed", 12, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key time to max[ms]",
        content: ["id-mousekey-time-to-max", 13, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel delay[ms]",
        content: ["id-mousekey-wheel-delay", 14, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel interval[ms]",
        content: ["id-mousekey-wheel-interval", 15, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel max speed",
        content: ["id-mousekey-wheel-max-speed", 16, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel time to max[ms]",
        content: ["id-mousekey-wheel-time-to-max", 17, 2],
        options: [0, 500],
      },
    ],
  },
  */
];

export async function QuantumSettingsReadAll(via: ViaKeyboard): Promise<{ [id: string]: number }> {
  const ids = QuantumSettingDefinition.flatMap((set) =>
    set.content.map((setting) => setting.content),
  );

  return Object.entries(await via.GetQuantumSettingsValue(ids.map((id) => id[1] as number))).reduce(
    (acc, v) => {
      return {
        ...acc,
        [v[0]]:
          v[1] & ((1 << ((ids.find((k) => k[1].toString() === v[0])?.[2] as number) * 8)) - 1),
      };
    },
    {} as { [id: string]: number },
  );
}
