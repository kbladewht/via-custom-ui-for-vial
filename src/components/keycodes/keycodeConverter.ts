import { match, P } from "ts-pattern";

export type QmkKeycode = {
  value: number;
  group?: string;
  key: string;
  label: string;
  shiftedLabel?: string;
  aliases?: string[];
  hold?: number;
  tap?: number;
  modLabel?: string;
  holdLabel?: string;
  /** Readable modifier name (e.g. "LCtrl") used by the stacked keycap legend. */
  modNameLabel?: string;
};

export type TapDance = {
  onTap: QmkKeycode;
  onHold: QmkKeycode;
  onDoubleTap: QmkKeycode;
  onTapHold: QmkKeycode;
  tappingTerm: number;
};

export type Combo = {
  key1: QmkKeycode;
  key2: QmkKeycode;
  key3: QmkKeycode;
  key4: QmkKeycode;
  output: QmkKeycode;
};

export type Override = {
  trigger: QmkKeycode;
  replacement: QmkKeycode;
  layers: number;
  triggerMods: number;
  negativeModMask: number;
  suppressedMods: number;
  options: number;
};

export enum ModifierBit {
  Ctrl = 1 << 0,
  Shift = 1 << 1,
  Alt = 1 << 2,
  GUI = 1 << 3,
  UseRight = 1 << 4,
}

export type ModifierBits = number;

export const DefaultQmkKeycode: QmkKeycode = {
  value: 0,
  key: "KC_NO",
  label: "",
};

function modStringShort(mod: number) {
  const MOD = ["C", "S", "A", "G"];
  const activeMod = [];
  for (let b = 0; b < 4; b++) {
    if (mod & (1 << b)) {
      activeMod.push(MOD[b]);
    }
  }

  return mod & 0x10 ? `${activeMod.join("+")}*` : `*${activeMod.join("+")}`;
}

function modStringLong(mod: number) {
  const MOD = ["CTL", "SFT", "ALT", "GUI"];
  const activeMod = [];
  for (let b = 0; b < 4; b++) {
    if (mod & (1 << b)) {
      activeMod.push(MOD[b]);
    }
  }

  return mod & 0x10
    ? `${activeMod.map((m) => `MOD_R${m}`).join("|")}`
    : `${activeMod.map((m) => `MOD_L${m}`).join("|")}`;
}

/**
 * Readable modifier name for the keycap legend, e.g. "LCtrl" or "RShift".
 * Multiple modifiers fall back to the compact notation ("*C+S") so the label
 * still fits on a single keycap line.
 */
export function modStringName(mod: number) {
  const MOD = ["Ctrl", "Shift", "Alt", "GUI"];
  const activeMod = [];
  for (let b = 0; b < 4; b++) {
    if (mod & (1 << b)) {
      activeMod.push(MOD[b]);
    }
  }

  if (activeMod.length !== 1) {
    return modStringShort(mod);
  }

  return `${mod & 0x10 ? "R" : "L"}${activeMod[0]}`;
}

/**
 * The two legend lines of a keycap. Vial labels some keycodes on two lines ("LS\n(" for the space
 * cadet keys, "~\nEsc" for grave escape): the first line is the upper legend, the second one the
 * lower one. Keycodes without an upper legend return an empty first line.
 */
export function keycodeLegendLines(keycode: QmkKeycode): { top: string; bottom: string } {
  const label = keycode.label ?? "";
  if (keycode.shiftedLabel !== undefined) {
    return { top: keycode.shiftedLabel, bottom: label };
  }

  const [top, ...rest] = label.split("\n");
  return rest.length === 0 ? { top: "", bottom: label } : { top: top, bottom: rest.join("\n") };
}

/**
 * Modifier templates of Vial's Quantum tab (the "mods" layout of its keycode picker): one-shot
 * modifiers ("OSM(mod)"), modifier keycodes ("mod(kc)") and mod-tap keycodes ("mod_T(kc)").
 * The order and the labels below are Vial's own, so the catalog keycaps look like the official ones.
 */
type ModifierTemplate = { mod: number; label: string };

const OSM_TEMPLATE_MODIFIERS: ModifierTemplate[] = [
  { mod: ModifierBit.Shift, label: "LSft" },
  { mod: ModifierBit.Ctrl, label: "LCtl" },
  { mod: ModifierBit.Alt, label: "LAlt" },
  { mod: ModifierBit.GUI, label: "LGui" },
  { mod: ModifierBit.Shift | ModifierBit.UseRight, label: "RSft" },
  { mod: ModifierBit.Ctrl | ModifierBit.UseRight, label: "RCtl" },
  { mod: ModifierBit.Alt | ModifierBit.UseRight, label: "RAlt" },
  { mod: ModifierBit.GUI | ModifierBit.UseRight, label: "RGui" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift, label: "CS" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt, label: "CA" },
  { mod: ModifierBit.Ctrl | ModifierBit.GUI, label: "CG" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.GUI, label: "CSG" },
  { mod: ModifierBit.Shift | ModifierBit.Alt, label: "SA" },
  { mod: ModifierBit.Shift | ModifierBit.GUI, label: "SG" },
  { mod: ModifierBit.Shift | ModifierBit.Alt | ModifierBit.GUI, label: "SAG" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt | ModifierBit.GUI, label: "CAG" },
  { mod: ModifierBit.Alt | ModifierBit.GUI, label: "AG" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt, label: "Meh" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt | ModifierBit.GUI, label: "Hyper" },
];

const MODIFIER_TEMPLATE_MODIFIERS: ModifierTemplate[] = [
  { mod: ModifierBit.Shift, label: "LSft" },
  { mod: ModifierBit.Ctrl, label: "LCtl" },
  { mod: ModifierBit.Alt, label: "LAlt" },
  { mod: ModifierBit.GUI, label: "LGui" },
  { mod: ModifierBit.Shift | ModifierBit.UseRight, label: "RSft" },
  { mod: ModifierBit.Ctrl | ModifierBit.UseRight, label: "RCtl" },
  { mod: ModifierBit.Alt | ModifierBit.UseRight, label: "RAlt" },
  { mod: ModifierBit.GUI | ModifierBit.UseRight, label: "RGui" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift, label: "C_S" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt, label: "LCA" },
  { mod: ModifierBit.Ctrl | ModifierBit.GUI, label: "LCG" },
  { mod: ModifierBit.Ctrl | ModifierBit.GUI | ModifierBit.UseRight, label: "RCG" },
  { mod: ModifierBit.Shift | ModifierBit.Alt, label: "LSA" },
  { mod: ModifierBit.Shift | ModifierBit.GUI, label: "LSG" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt | ModifierBit.GUI, label: "LCAG" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt, label: "MEH" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt | ModifierBit.GUI, label: "HYPR" },
];

const MOD_TAP_TEMPLATE_MODIFIERS: ModifierTemplate[] = [
  { mod: ModifierBit.Shift, label: "LSFT_T" },
  { mod: ModifierBit.Ctrl, label: "LCTL_T" },
  { mod: ModifierBit.Alt, label: "LALT_T" },
  { mod: ModifierBit.GUI, label: "LGUI_T" },
  { mod: ModifierBit.Shift | ModifierBit.UseRight, label: "RSFT_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.UseRight, label: "RCTL_T" },
  { mod: ModifierBit.Alt | ModifierBit.UseRight, label: "RALT_T" },
  { mod: ModifierBit.GUI | ModifierBit.UseRight, label: "RGUI_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift, label: "C_S_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt, label: "LCA_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.GUI, label: "LCG_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.GUI | ModifierBit.UseRight, label: "RCG_T" },
  { mod: ModifierBit.Shift | ModifierBit.Alt, label: "LSA_T" },
  { mod: ModifierBit.Shift | ModifierBit.GUI, label: "LSG_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt | ModifierBit.GUI, label: "LCAG_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Alt | ModifierBit.GUI | ModifierBit.UseRight, label: "RCAG_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt, label: "Meh_T" },
  { mod: ModifierBit.Ctrl | ModifierBit.Shift | ModifierBit.Alt | ModifierBit.GUI, label: "ALL_T" },
];

/** Vial's labels of the one-shot modifiers, also used when a stored OSM keycode is shown again. */
const OSM_MODIFIER_LABELS = new Map(
  OSM_TEMPLATE_MODIFIERS.map((template) => [template.mod, template.label]),
);

/** One keycap of the Quantum templates Vial draws on its Quantum tab. */
type QuantumTemplateDefinition = {
  /** QMK names of a keycode of the loaded keycode data, in order of preference. */
  names?: string[];
  /** Template of a keycode that Vial builds from a modifier mask instead of the keycode data. */
  template?: { kind: "osm" | "mod" | "modTap"; mod: number; label: string };
  /** Key width in 1u units, for the keys Vial draws wider than a normal key. */
  widthMultiplier?: number;
  /** Gap in 1u units before the key, taken from the x offsets of Vial's layout. */
  gapBefore?: number;
};

/** Expands the modifier templates of a row, keeping the group gaps of Vial's layout. */
function modifierTemplateRow(
  kind: "osm" | "mod" | "modTap",
  templates: ModifierTemplate[],
  gaps: { [index: number]: number },
): QuantumTemplateDefinition[] {
  return templates.map((template, index) => ({
    template: { kind: kind, mod: template.mod, label: template.label },
    gapBefore: gaps[index],
  }));
}

/**
 * The four rows of Vial's Quantum templates, in Vial's order: the grave escape / space cadet keys,
 * the one-shot modifiers, the modifier keycodes and the mod-tap keycodes.
 */
const QUANTUM_TEMPLATE_ROWS: QuantumTemplateDefinition[][] = [
  [
    { names: ["QK_GRAVE_ESCAPE", "QK_GESC", "KC_GESC"] },
    {
      names: ["QK_SPACE_CADET_LEFT_SHIFT_PARENTHESIS_OPEN", "SC_LSPO", "KC_LSPO"],
      gapBefore: 0.75,
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_RIGHT_SHIFT_PARENTHESIS_CLOSE", "SC_RSPC", "KC_RSPC"],
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_LEFT_CTRL_PARENTHESIS_OPEN", "SC_LCPO", "KC_LCPO"],
      gapBefore: 0.25,
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_RIGHT_CTRL_PARENTHESIS_CLOSE", "SC_RCPC", "KC_RCPC"],
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_LEFT_ALT_PARENTHESIS_OPEN", "SC_LAPO", "KC_LAPO"],
      gapBefore: 0.25,
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_RIGHT_ALT_PARENTHESIS_CLOSE", "SC_RAPC", "KC_RAPC"],
      widthMultiplier: 1.25,
    },
    {
      names: ["QK_SPACE_CADET_RIGHT_SHIFT_ENTER", "SC_SENT", "KC_SFTENT"],
      gapBefore: 0.5,
      widthMultiplier: 2.25,
    },
  ],
  modifierTemplateRow("osm", OSM_TEMPLATE_MODIFIERS, { 4: 0.25, 8: 0.25 }),
  modifierTemplateRow("mod", MODIFIER_TEMPLATE_MODIFIERS, { 4: 0.25, 8: 0.25, 14: 1, 15: 1 }),
  modifierTemplateRow("modTap", MOD_TAP_TEMPLATE_MODIFIERS, { 4: 0.25, 8: 0.25, 14: 1 }),
];

/** One keycap of the Quantum template rows, ready to be drawn by the keycode catalog. */
export type QuantumTemplateKeycap = {
  keycode: QmkKeycode;
  widthMultiplier?: number;
  gapBefore?: number;
};

type KeycodeDefinition = {
  [val: string]: {
    group: string;
    key: string;
    label?: string;
    shiftedLabel?: string;
    aliases?: string[];
    language?: { [lang: string]: { label: string; shiftedLabel?: string } };
  };
};

export type KeycodeRangeDefinition = { [range: string]: { start: number; end: number } };
type KeycodeLocaleDefinition = { [key: string]: { [language: string]: string } };

type StaticKeycodeData = {
  keycodes: KeycodeDefinition;
  keycodeRange: KeycodeRangeDefinition;
  keycodeLocale: KeycodeLocaleDefinition;
};

const staticKeycodeDataCache = new Map<string, Promise<StaticKeycodeData>>();

function loadStaticKeycodeData(version: string): Promise<StaticKeycodeData> {
  const cached = staticKeycodeDataCache.get(version);
  if (cached) return cached;

  const request = Promise.all([
    fetch(`keycodes/${version}/keycodes.json`).then((response) => response.json()),
    fetch(`keycodes/${version}/keycode_override.json`).then((response) => response.json()),
    fetch(`keycodes/${version}/quantum_keycode_range.json`).then((response) => response.json()),
    fetch(`keycodes/${version}/keycode_locale.json`).then((response) => response.json()),
  ]).then(([keycodes, keycodeOverride, keycodeRange, keycodeLocale]) => ({
    keycodes: { ...keycodes, ...keycodeOverride },
    keycodeRange,
    keycodeLocale,
  }));

  staticKeycodeDataCache.set(version, request);
  return request;
}

function getCustomKeycodeTranslation(
  translations: { [key: string]: string },
  key: string,
): string | undefined {
  const normalizedKey = key.trim().toLocaleLowerCase();
  return Object.entries(translations).find(
    ([translationKey]) => translationKey.trim().toLocaleLowerCase() === normalizedKey,
  )?.[1];
}

export class KeycodeConverter {
  private customKeycodes;
  private layer: number;
  private tapKeycodeList: QmkKeycode[] = [];
  private tapKeycodeMap: QmkKeycode[] = [];
  private holdKeycodeList: QmkKeycode[] = [];
  private modTapKeycodeBase: QmkKeycode;
  private keycode_range: KeycodeRangeDefinition;

  static async Create(
    layer: number = 16,
    customKeycodes?: { name: string; title: string; shortName: string }[],
    macroCount: number = 0,
    tapDanceCount: number = 0,
    language: string = "US",
    version: string = "0.0.3",
    uiLanguage: string = "en",
  ) {
    const { keycodes, keycodeRange: keycode_range, keycodeLocale } =
      await loadStaticKeycodeData(version);
    const customKeycodeTranslations = Object.fromEntries(
      Object.entries(keycodeLocale).map(([key, translations]) => [
        key,
        translations[uiLanguage] ?? translations.en,
      ]),
    );

    return new KeycodeConverter(
      keycodes,
      keycode_range,
      layer,
      customKeycodes,
      macroCount,
      tapDanceCount,
      language,
      customKeycodeTranslations,
    );
  }

  private constructor(
    keycodes: KeycodeDefinition,
    keycode_range: KeycodeRangeDefinition,
    layer: number = 16,
    customKeycodes?: { name: string; title: string; shortName: string }[],
    macroCount: number = 0,
    tapDanceCount: number = 0,
    language: string = "US",
    customKeycodeTranslations: { [key: string]: string } = {},
  ) {
    this.customKeycodes = customKeycodes;
    this.layer = layer;
    this.keycode_range = keycode_range;
    const languageKey = language.trim().toLocaleLowerCase();
    const languageKeys = languageKey === "zh" ? [languageKey, "chinese"] : [languageKey];

    this.tapKeycodeList = Object.entries(keycodes)
      .filter(
        (k) => {
          if (k[1].group !== "macro") return true;

          const value = parseInt(k[0]);
          const isDynamicMacro =
            value >= keycode_range.QK_MACRO.start && value <= keycode_range.QK_MACRO.end;
          return !isDynamicMacro || value - keycode_range.QK_MACRO.start < macroCount;
        },
      )
      .map((k) => {
        const value = parseInt(k[0]);
        if (
          this.customKeycodes &&
          value >= keycode_range.QK_KB.start &&
          value - keycode_range.QK_KB.start < this.customKeycodes.length
        ) {
          const customKey = this.customKeycodes[value - keycode_range.QK_KB.start];
          const translatedLabel = [customKey.name, customKey.title, customKey.shortName]
            .map((key) => getCustomKeycodeTranslation(customKeycodeTranslations, key))
            .find((label) => label !== undefined);
          return {
            group: "custom",
            value: value,
            key: customKey.name,
            label: translatedLabel ?? customKey.shortName,
          };
        } else {
          let langLabel: string | undefined = undefined;
          let shiftedLabel: string | undefined = k[1].shiftedLabel;
          const languageDefinition = k[1].language && languageKeys.map((key) => k[1].language?.[key]).find(Boolean);
          if (languageDefinition) {
            langLabel = languageDefinition.label;
            shiftedLabel = languageDefinition.shiftedLabel;
          }

          return {
            value: parseInt(k[0]),
            ...k[1],
            shiftedLabel: shiftedLabel,
            label: langLabel ?? k[1].label ?? k[1].aliases?.[0] ?? k[1].key,
          };
        }
      });

    if (tapDanceCount > 0) {
      this.tapKeycodeList.push(
        ...[...Array(tapDanceCount)].map((_, idx) => {
          return {
            group: "tapdance",
            value: keycode_range.QK_TAP_DANCE.start + idx,
            key: `TAP_DANCE_${idx}`,
            label: `TD${idx}`,
          };
        }),
      );
    }

    if (layer > 0) {
      this.tapKeycodeList.push(
        ...[...Array(layer)].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_TO.start + idx,
            key: `To Layer ${idx}`,
            label: `TO${idx}`,
          };
        }),
      );
      this.tapKeycodeList.push(
        ...[...Array(layer)].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_MOMENTARY.start + idx,
            key: `Momentary Layer ${idx}`,
            label: `MO${idx}`,
          };
        }),
      );
      this.tapKeycodeList.push(
        ...[...Array(Math.min(layer, 16))].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_LAYER_TAP.start + (idx << 8),
            key: `LT(${idx},KC_NO)`,
            hold: (keycode_range.QK_LAYER_TAP.start >> 8) + idx,
            tap: 0,
            label: `LT${idx}`,
          };
        }),
      );
      this.tapKeycodeList.push(
        ...[...Array(layer)].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_DEF_LAYER.start + idx,
            key: `Default Layer ${idx}`,
            label: `DF${idx}`,
          };
        }),
      );
      this.tapKeycodeList.push(
        ...[...Array(layer)].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_TOGGLE_LAYER.start + idx,
            key: `Toggle Layer ${idx}`,
            label: `TG${idx}`,
          };
        }),
      );
      this.tapKeycodeList.push(
        ...[...Array(layer)].map((_, idx) => {
          return {
            group: "layer",
            value: keycode_range.QK_ONE_SHOT_LAYER.start + idx,
            key: `Oneshot Layer ${idx}`,
            label: `OSL${idx}`,
          };
        }),
      );
    }
    this.tapKeycodeList.push(
      ...[...Array(Math.min(this.layer, 16))].map((_, layer) => {
        return {
          group: "layer",
          value: keycode_range.QK_LAYER_MOD.start + (layer << 5),
          key: `Layer Mod(${layer}, mod)`,
          label: `LM${layer}`,
        };
      }),
    );

    // "Modifier + keycode" templates (LCtl(kc), LSft(kc), ...) live on the Quantum tab of the
    // keycode catalog instead of this list: Vial draws them as its own template keyboard, the base
    // keycode is chosen afterwards by clicking the second legend line of the key (tap === 0, so
    // that line stays empty until a keycode is picked).

    this.tapKeycodeList = this.tapKeycodeList.map((k) => {
      return { ...k, label: k.label.length > 2 ? k.label.replace(/_/g, " ") : k.label };
    });
    this.tapKeycodeMap = Array(0xffff);
    for (const k of this.tapKeycodeList) {
      this.tapKeycodeMap[k.value] = k;
    }

    this.modTapKeycodeBase = {
      label: " Mod Tap",
      value: keycode_range.QK_MOD_TAP.start,
      key: "MOD_TAP(kc)",
    };

    this.holdKeycodeList.push(DefaultQmkKeycode, this.modTapKeycodeBase);
    this.holdKeycodeList.push(
      ...[...Array(Math.min(this.layer, 16))].map((_, layer) => {
        return {
          label: `Layer Tap ${layer}`,
          value: keycode_range.QK_LAYER_TAP.start + (layer << 8),
          key: `LT(${layer}, kc)`,
        };
      }),
    );
  }

  public getTapKeycodeList(): QmkKeycode[] {
    return this.tapKeycodeList;
  }

  public getHoldKeycodeList(): QmkKeycode[] {
    return this.holdKeycodeList;
  }

  /**
   * Keycaps of Vial's Quantum templates in the four rows Vial draws them in. The first row uses the
   * keycodes of the loaded keycode data (grave escape, space cadet), the other rows are the
   * "modifier template" keycodes (OSM(mod), mod(kc), mod_T(kc)) without a base keycode yet.
   */
  public getQuantumTemplateRows(): QuantumTemplateKeycap[][] {
    return QUANTUM_TEMPLATE_ROWS.map((row) =>
      row.flatMap((definition) => {
        const keycode =
          definition.names === undefined
            ? this.templateKeycode(definition)
            : this.findKeycode(definition.names);
        return keycode === undefined
          ? []
          : [
              {
                keycode: keycode,
                widthMultiplier: definition.widthMultiplier,
                gapBefore: definition.gapBefore,
              },
            ];
      }),
    );
  }

  /** Resolves a keycode of the loaded keycode data by its QMK name or one of its aliases. */
  private findKeycode(names: string[]): QmkKeycode | undefined {
    return this.tapKeycodeList.find(
      (keycode) =>
        names.includes(keycode.key) ||
        names.some((name) => keycode.aliases?.includes(name) ?? false),
    );
  }

  /**
   * Builds one of Vial's "modifier template" keycodes: a modifier keycode without base key (as long
   * as none is picked the second legend line of the key stays empty). Vial labels the keycaps with
   * the modifier on the first line and the "(kc)" placeholder of the missing base key below it.
   */
  private templateKeycode(definition: QuantumTemplateDefinition): QmkKeycode | undefined {
    if (definition.template === undefined) return undefined;
    const template = definition.template;
    if (template.kind === "osm") {
      return this.convertIntToKeycode(this.keycode_range.QK_ONE_SHOT_MOD.start + template.mod);
    }

    const value =
      template.kind === "mod"
        ? template.mod << 8
        : this.keycode_range.QK_MOD_TAP.start + (template.mod << 8);
    return {
      ...this.convertIntToKeycode(value),
      shiftedLabel: template.label,
      label: "(kc)",
      tap: 0,
      modLabel: template.label,
      modNameLabel: template.label,
    };
  }

  /** Keycode ranges of the loaded keycode data (used to describe what a keycode does). */
  public getKeycodeRange(): KeycodeRangeDefinition {
    return this.keycode_range;
  }

  public getTapKeycode(keycode?: QmkKeycode): QmkKeycode {
    if (keycode === undefined) {
      return DefaultQmkKeycode;
    } else if (
      this.keycode_range.QK_MODS.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_LAYER_TAP.end
    ) {
      return this.convertIntToKeycode(keycode.value & 0xff);
    } else if (
      this.keycode_range.QK_LAYER_MOD.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_LAYER_MOD.end
    ) {
      return this.convertIntToKeycode(keycode.value & 0xffe0);
    } else {
      return keycode;
    }
  }

  public getHoldKeycode(keycode?: QmkKeycode): QmkKeycode {
    if (keycode === undefined) {
      return DefaultQmkKeycode;
    } else if (
      this.keycode_range.QK_MOD_TAP.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_MOD_TAP.end
    ) {
      return this.modTapKeycodeBase;
    } else if (
      this.keycode_range.QK_LAYER_TAP.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_LAYER_TAP.end
    ) {
      return (
        this.getHoldKeycodeList().find(
          (value) => (value.value & 0xff00) === (keycode.value & 0xff00),
        ) ?? DefaultQmkKeycode
      );
    } else {
      return DefaultQmkKeycode;
    }
  }

  public getModifier(keycode?: QmkKeycode): ModifierBits {
    if (keycode === undefined) {
      return 0;
    } else if (
      this.keycode_range.QK_MODS.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_MOD_TAP.end
    ) {
      return (keycode.value >> 8) & 0x1f;
    } else if (
      this.keycode_range.QK_LAYER_MOD.start <= keycode.value &&
      keycode.value <= this.keycode_range.QK_LAYER_MOD.end
    ) {
      return keycode.value & 0x1f;
    } else {
      return 0;
    }
  }

  public combineKeycodes(
    tap: QmkKeycode,
    hold: QmkKeycode,
    mods: ModifierBits = 0,
  ): QmkKeycode | null {
    if (
      this.keycode_range.QK_BASIC.start <= tap.value &&
      tap.value <= this.keycode_range.QK_BASIC.end &&
      hold.value == 0
    ) {
      return this.convertIntToKeycode(tap.value | (mods << 8));
    } else if (
      this.keycode_range.QK_LAYER_MOD.start <= tap.value &&
      tap.value <= this.keycode_range.QK_LAYER_MOD.end
    ) {
      return this.convertIntToKeycode((tap.value & 0xffe0) | mods);
    } else if (tap.value > this.keycode_range.QK_BASIC.end) {
      return this.convertIntToKeycode(tap.value);
    } else if (
      this.keycode_range.QK_MOD_TAP.start <= hold.value &&
      hold.value <= this.keycode_range.QK_MOD_TAP.end
    ) {
      return this.convertIntToKeycode((tap.value & 0x00ff) | (hold.value & 0xff00) | (mods << 8));
    } else if (
      this.keycode_range.QK_LAYER_TAP.start <= hold.value &&
      hold.value <= this.keycode_range.QK_LAYER_TAP.end
    ) {
      return this.convertIntToKeycode((tap.value & 0x00ff) | (hold.value & 0xff00));
    } else {
      return tap;
    }
  }

  /**
   * Replaces only the base keycode of a tap-hold / modifier key (LT(...), LCTL(kc), MT(...), ...)
   * while keeping its layer and modifiers. Used when the second legend line of a key is selected
   * on its own. Returns null when the picked keycode cannot be used as a base key.
   */
  public combineBaseKeycode(original: QmkKeycode, base: QmkKeycode): QmkKeycode | null {
    if (
      !Number.isInteger(base.value) ||
      base.value < this.keycode_range.QK_BASIC.start ||
      base.value > this.keycode_range.QK_BASIC.end
    ) {
      return null;
    }

    return this.combineKeycodes(base, this.getHoldKeycode(original), this.getModifier(original));
  }

  public convertIntToKeycode(value: number): QmkKeycode {
    if (value === undefined) {
      return DefaultQmkKeycode;
    }

    if (
      this.tapKeycodeMap[value] !== undefined &&
      !(value >= this.keycode_range.QK_LAYER_TAP.start && value <= this.keycode_range.QK_LAYER_TAP.end)
    ) return this.tapKeycodeMap[value];

    return match(value)
      .with(
        P.number.between(this.keycode_range.QK_MODS.start, this.keycode_range.QK_MODS.end),
        (val) => {
          const modLabel = modStringShort((val >> 8) & 0x1f);
          const modLongLabel = modStringLong((val >> 8) & 0x1f);
          const baseKeycode = this.convertIntToKeycode(val & 0xff);
          return {
            value: val,
            key: `MODS(${modLongLabel},${baseKeycode.key})`,
            modLabel: modLabel,
            modNameLabel: modStringName((val >> 8) & 0x1f),
            tap: val & 0xff,
            label: baseKeycode.label,
            shiftedLabel: baseKeycode.shiftedLabel,
          };
        },
      )
      .with(
        P.number.between(this.keycode_range.QK_MOD_TAP.start, this.keycode_range.QK_MOD_TAP.end),
        (val) => {
          const modLabel = modStringShort((val >> 8) & 0x1f);
          const modLongLabel = modStringLong((val >> 8) & 0x1f);
          const baseKeycode = this.convertIntToKeycode(val & 0xff);
          return {
            value: val,
            key: `MOD_TAP(${modLongLabel},${baseKeycode.key})`,
            holdLabel: modLabel,
            modNameLabel: modStringName((val >> 8) & 0x1f),
            tap: val & 0xff,
            label: baseKeycode.label,
            shiftedLabel: baseKeycode.shiftedLabel,
          };
        },
      )
      .with(
        P.number.between(
          this.keycode_range.QK_LAYER_TAP.start,
          this.keycode_range.QK_LAYER_TAP.end,
        ),
        (val) => {
          const baseKeycode = this.convertIntToKeycode(val & 0xff);
          return {
            value: val,
            key: `LT(${(val >> 8) & 0xf},${baseKeycode.key})`,
            hold: val >> 8,
            holdLabel: `Layer${(val >> 8) & 0xf}`,
            tap: val & 0xff,
            label: baseKeycode.label,
            shiftedLabel: baseKeycode.shiftedLabel,
          };
        },
      )
      .with(
        P.number.between(
          this.keycode_range.QK_LAYER_MOD.start,
          this.keycode_range.QK_LAYER_MOD.end,
        ),
        (val) => {
          const modLabel = modStringShort(val & 0x1f);
          const modLongLabel = modStringLong(val & 0x1f);
          return {
            value: val,
            key: `LM(${(val >> 5) & 0xf}, ${modLongLabel})`,
            label: `LM(${(val >> 5) & 0xf}, ${modLabel})`,
          };
        },
      )
      .with(
        P.number.between(
          this.keycode_range.QK_ONE_SHOT_MOD.start,
          this.keycode_range.QK_ONE_SHOT_MOD.end,
        ),
        (val) => {
          const mod = val & 0x1f;
          return {
            value: val,
            key: `OSM(${modStringLong(mod)})`,
            // Vial draws "OSM" above the modifier it applies ("LSft", "Meh", "Hyper", ...).
            shiftedLabel: "OSM",
            label: OSM_MODIFIER_LABELS.get(mod) ?? modStringName(mod),
          };
        },
      )
      .with(P.number, () => {
        // Match Vial's display of unrecognized keycodes as a raw hex value.
        const hexLabel = `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
        return {
          group: "unknown",
          key: hexLabel,
          label: hexLabel,
          value: value,
        };
      })
      .exhaustive();
  }

  public convertTapDance(td: {
    onTap: number;
    onHold: number;
    onDoubleTap: number;
    onTapHold: number;
    tappingTerm: number;
  }): TapDance {
    return {
      onTap: this.convertIntToKeycode(td.onTap),
      onHold: this.convertIntToKeycode(td.onHold),
      onDoubleTap: this.convertIntToKeycode(td.onDoubleTap),
      onTapHold: this.convertIntToKeycode(td.onTapHold),
      tappingTerm: td.tappingTerm,
    };
  }

  public convertCombo(combo: {
    key1: number;
    key2: number;
    key3: number;
    key4: number;
    output: number;
  }): Combo {
    return {
      key1: this.convertIntToKeycode(combo.key1),
      key2: this.convertIntToKeycode(combo.key2),
      key3: this.convertIntToKeycode(combo.key3),
      key4: this.convertIntToKeycode(combo.key4),
      output: this.convertIntToKeycode(combo.output),
    };
  }

  public convertOverride(override: {
    trigger: number;
    replacement: number;
    layers: number;
    triggerMods: number;
    negativeModMask: number;
    suppressedMods: number;
    options: number;
  }): Override {
    return {
      ...override,
      trigger: this.convertIntToKeycode(override.trigger),
      replacement: this.convertIntToKeycode(override.replacement),
    };
  }
}
