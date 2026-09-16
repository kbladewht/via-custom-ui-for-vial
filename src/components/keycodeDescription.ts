import { match, P } from "ts-pattern";
import keycodeDescriptions from "../locales/keycodeDescriptions.json";
import { KeycodeConverter, modStringName, QmkKeycode } from "./keycodes/keycodeConverter";

/** Descriptions of single keycodes, keyed by their name (e.g. "QK_AUDIO_ON"). */
const keycodes: { [name: string]: string | undefined } = keycodeDescriptions.keycodes;

/** Fills the {name} placeholders of a template; values that are missing keep their placeholder. */
function filled(template: string, values: { [name: string]: string | number }) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = values[name];
    return value === undefined || value === "" ? placeholder : String(value);
  });
}

/**
 * Fills a template and returns undefined when a placeholder could not be filled, so a template
 * without the needed value (e.g. "MIDI：第 {index} 号通道" for "QK_MIDI_CHANNEL_UP") is skipped.
 */
function described(template: string, values: { [name: string]: string | number } = {}) {
  const text = filled(template, values);
  return text === "" || text.includes("{") ? undefined : text;
}

/** Describes a keycode of a numbered family (MIDI notes, joystick buttons, custom keycodes, ...). */
function describeFamily(name: string) {
  for (const pattern of keycodeDescriptions.patterns) {
    if (!name.startsWith(pattern.prefix)) continue;
    const suffix = name.slice(pattern.prefix.length);
    const text = described(pattern.text, {
      index: /^\d+$/.test(suffix) ? suffix : "",
      name: suffix.replace(/_SHARP/g, "#").replace(/_/g, " "),
    });
    if (text) return text;
  }
  return undefined;
}

/**
 * Explains what a keycode does, e.g. "临时层：按住时切换到第1层，松开后回到原来的层。" for MO1 or
 * "长按切换到第2层，轻按输出A。" for LT2 + A, so the key setting hint can describe the selected key.
 * The layer / tap-hold / modifier families are described by their keycode range, the rarer single
 * keycodes (audio, magic, lighting, ...) by their name, and the numbered families (MIDI notes,
 * joystick buttons, custom keycodes, ...) by their prefix. All texts come from
 * locales/keycodeDescriptions.json; keycodes without a description return undefined.
 */
export function describeKeycode(
  keycode: QmkKeycode,
  converter: KeycodeConverter,
): string | undefined {
  return (
    describeRange(keycode, converter) ??
    keycodes[keycode.key] ??
    describeFamily(keycode.key) ??
    describeCustom(keycode, converter)
  );
}

/**
 * Describes a keycode declared by the keyboard definition (Vial customKeycodes in the QK_KB /
 * QK_USER ranges). Those keycodes carry the label from the definition, which names the function the
 * firmware implements (e.g. "音量 +").
 */
function describeCustom(keycode: QmkKeycode, converter: KeycodeConverter) {
  const range = converter.getKeycodeRange();
  const isCustomKeycode =
    keycode.group === "custom" ||
    (keycode.value >= range.QK_KB.start && keycode.value <= range.QK_USER.end);
  const label = keycode.label.trim();
  if (!isCustomKeycode || label === "" || label === keycode.key) return undefined;

  return described(keycodeDescriptions.functions.custom, { label });
}

/** Describes the layer / tap-hold / modifier keycodes by their QMK keycode range. */
function describeRange(keycode: QmkKeycode, converter: KeycodeConverter): string | undefined {
  const range = converter.getKeycodeRange();
  const value = keycode.value;
  // The layer of the layer keycodes is encoded in the low bits, the modifier of the layer mod keys
  // in the low 5 bits.
  const layer = value & 0x1f;
  const functions = keycodeDescriptions.functions;
  // A stacked key shows its base keycode on the second line, which is empty until one is picked.
  const base =
    keycode.tap === 0 || keycode.label === ""
      ? keycodeDescriptions.labels.emptyBase
      : keycode.label;
  const mod = keycode.modNameLabel ?? keycode.modLabel ?? modStringName((value >> 8) & 0x1f);

  return described(
    match(value)
      .with(0, () => functions.KC_NO)
      .with(1, () => functions.KC_TRNS)
      .with(P.number.between(range.QK_MODS.start, range.QK_MODS.end), () =>
        filled(functions.MODS, { mod, base }),
      )
      .with(P.number.between(range.QK_MOD_TAP.start, range.QK_MOD_TAP.end), () =>
        filled(functions.MOD_TAP, { mod, base }),
      )
      .with(P.number.between(range.QK_LAYER_TAP.start, range.QK_LAYER_TAP.end), () =>
        filled(functions.LT, { layer: keycode.hold === undefined ? 0 : keycode.hold & 0xf, base }),
      )
      .with(P.number.between(range.QK_LAYER_MOD.start, range.QK_LAYER_MOD.end), () =>
        filled(functions.LM, { layer: (value >> 5) & 0xf, mod: modStringName(value & 0x1f) }),
      )
      .with(P.number.between(range.QK_TO.start, range.QK_TO.end), () =>
        filled(functions.TO, { layer }),
      )
      .with(P.number.between(range.QK_MOMENTARY.start, range.QK_MOMENTARY.end), () =>
        filled(functions.MO, { layer }),
      )
      .with(P.number.between(range.QK_DEF_LAYER.start, range.QK_DEF_LAYER.end), () =>
        filled(functions.DF, { layer }),
      )
      .with(P.number.between(range.QK_TOGGLE_LAYER.start, range.QK_TOGGLE_LAYER.end), () =>
        filled(functions.TG, { layer }),
      )
      .with(P.number.between(range.QK_ONE_SHOT_LAYER.start, range.QK_ONE_SHOT_LAYER.end), () =>
        filled(functions.OSL, { layer }),
      )
      .with(P.number.between(range.QK_LAYER_TAP_TOGGLE.start, range.QK_LAYER_TAP_TOGGLE.end), () =>
        filled(functions.TT, { layer }),
      )
      .with(P.number.between(range.QK_ONE_SHOT_MOD.start, range.QK_ONE_SHOT_MOD.end), () =>
        filled(functions.OSM, { mod: modStringName(value & 0x1f) }),
      )
      .with(P.number.between(range.QK_TAP_DANCE.start, range.QK_TAP_DANCE.end), () =>
        filled(functions.TD, { index: value - range.QK_TAP_DANCE.start }),
      )
      .with(P.number.between(range.QK_MACRO.start, range.QK_MACRO.end), () =>
        filled(functions.MACRO, { index: value - range.QK_MACRO.start }),
      )
      .otherwise(() => ""),
  );
}
