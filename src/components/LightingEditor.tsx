import { Box, ButtonBase, FormControl, InputLabel, MenuItem, Select, Slider } from "@mui/material";
import { useEffect, useState } from "react";
import quantumTranslations from "../locales/quantum.json";
import { ViaKeyboard } from "../services/vialKeyboad";
import { LightingColorPicker } from "./LightingColorPicker";

const VIAL_RGB_EFFECTS = [
  "Disable", "Direct Control", "Solid Color", "Alphas Mods", "Gradient Up Down",
  "Gradient Left Right", "Breathing", "Band Sat", "Band Val", "Band Pinwheel Sat",
  "Band Pinwheel Val", "Band Spiral Sat", "Band Spiral Val", "Cycle All", "Cycle Left Right",
  "Cycle Up Down", "Rainbow Moving Chevron", "Cycle Out In", "Cycle Out In Dual", "Cycle Pinwheel",
  "Cycle Spiral", "Dual Beacon", "Rainbow Beacon", "Rainbow Pinwheels", "Raindrops",
  "Jellybean Raindrops", "Hue Breathing", "Hue Pendulum", "Hue Wave", "Typing Heatmap",
  "Digital Rain", "Solid Reactive Simple", "Solid Reactive", "Solid Reactive Wide",
  "Solid Reactive Multiwide", "Solid Reactive Cross", "Solid Reactive Multicross",
  "Solid Reactive Nexus", "Solid Reactive Multinexus", "Splash", "Multisplash", "Solid Splash",
  "Solid Multisplash", "Pixel Rain", "Pixel Fractal",
];

const VIAL_RGB_EFFECTS_ZH: { [key: string]: string } = {
  "Disable": "关闭",
  "Direct Control": "直接控制",
  "Solid Color": "单色常量",
  "Alphas Mods": "字母与修饰键分色",
  "Gradient Up Down": "上下渐变",
  "Gradient Left Right": "左右渐变",
  "Breathing": "呼吸灯",
  "Band Sat": "饱和度光带",
  "Band Val": "亮度光带",
  "Band Pinwheel Sat": "旋转风车饱和度",
  "Band Pinwheel Val": "旋转风车亮度",
  "Band Spiral Sat": "螺旋饱和度",
  "Band Spiral Val": "螺旋亮度",
  "Cycle All": "全彩循环",
  "Cycle Left Right": "左右彩虹流动",
  "Cycle Up Down": "上下彩虹流动",
  "Rainbow Moving Chevron": "彩虹人字波",
  "Cycle Out In": "外向内循环",
  "Cycle Out In Dual": "双向内外循环",
  "Cycle Pinwheel": "风车循环",
  "Cycle Spiral": "螺旋循环",
  "Dual Beacon": "双向信标",
  "Rainbow Beacon": "彩虹信标",
  "Rainbow Pinwheels": "彩虹风车",
  "Raindrops": "雨滴效果",
  "Jellybean Raindrops": "糖豆雨滴",
  "Hue Breathing": "色相呼吸",
  "Hue Pendulum": "色相摆动",
  "Hue Wave": "色相波浪",
  "Typing Heatmap": "打字热力图",
  "Digital Rain": "黑客帝国数字雨",
  "Solid Reactive Simple": "单色简易触发",
  "Solid Reactive": "单色按键触发",
  "Solid Reactive Wide": "单色宽域触发",
  "Solid Reactive Multiwide": "单色多重宽域触发",
  "Solid Reactive Cross": "单色十字波纹",
  "Solid Reactive Multicross": "单色多重十字波纹",
  "Solid Reactive Nexus": "单色连结点放射",
  "Solid Reactive Multinexus": "单色多重连结点放射",
  "Splash": "彩虹涟漪",
  "Multisplash": "多重彩虹涟漪",
  "Solid Splash": "单色涟漪",
  "Solid Multisplash": "单色多重涟漪",
  "Pixel Rain": "像素雨",
  "Pixel Fractal": "像素分形",
};

const QMK_RGB_EFFECTS = [
  "All Off", "Solid Color", "Breathing 1", "Breathing 2", "Breathing 3", "Breathing 4",
  "Rainbow Mood 1", "Rainbow Mood 2", "Rainbow Mood 3", "Rainbow Swirl 1", "Rainbow Swirl 2",
  "Rainbow Swirl 3", "Rainbow Swirl 4", "Rainbow Swirl 5", "Rainbow Swirl 6", "Snake 1",
  "Snake 2", "Snake 3", "Snake 4", "Snake 5", "Snake 6", "Knight 1", "Knight 2", "Knight 3",
  "Christmas", "Gradient 1", "Gradient 2", "Gradient 3", "Gradient 4", "Gradient 5", "Gradient 6",
  "Gradient 7", "Gradient 8", "Gradient 9", "Gradient 10", "RGB Test", "Alternating",
];

const QMK_RGB_EFFECTS_ZH: { [key: string]: string } = {
  "All Off": "全部关闭",
  "Solid Color": "单色",
  "Breathing 1": "呼吸 1",
  "Breathing 2": "呼吸 2",
  "Breathing 3": "呼吸 3",
  "Breathing 4": "呼吸 4",
  "Rainbow Mood 1": "彩虹氛围 1",
  "Rainbow Mood 2": "彩虹氛围 2",
  "Rainbow Mood 3": "彩虹氛围 3",
  "Rainbow Swirl 1": "彩虹漩涡 1",
  "Rainbow Swirl 2": "彩虹漩涡 2",
  "Rainbow Swirl 3": "彩虹漩涡 3",
  "Rainbow Swirl 4": "彩虹漩涡 4",
  "Rainbow Swirl 5": "彩虹漩涡 5",
  "Rainbow Swirl 6": "彩虹漩涡 6",
  "Snake 1": "贪吃蛇 1",
  "Snake 2": "贪吃蛇 2",
  "Snake 3": "贪吃蛇 3",
  "Snake 4": "贪吃蛇 4",
  "Snake 5": "贪吃蛇 5",
  "Snake 6": "贪吃蛇 6",
  "Knight 1": "骑士巡逻 1",
  "Knight 2": "骑士巡逻 2",
  "Knight 3": "骑士巡逻 3",
  "Christmas": "圣诞节",
  "Gradient 1": "渐变 1",
  "Gradient 2": "渐变 2",
  "Gradient 3": "渐变 3",
  "Gradient 4": "渐变 4",
  "Gradient 5": "渐变 5",
  "Gradient 6": "渐变 6",
  "Gradient 7": "渐变 7",
  "Gradient 8": "渐变 8",
  "Gradient 9": "渐变 9",
  "Gradient 10": "渐变 10",
  "RGB Test": "RGB 测试",
  "Alternating": "交替闪烁",
};

function hexToHsv(value: string) {
  const hex = value.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;
  return {
    hue: Math.round((hue / 360) * 255),
    saturation: Math.round((max === 0 ? 0 : delta / max) * 255),
  };
}

function hsvToHex(hue: number, saturation: number, value: number) {
  const h = (hue / 255) * 360;
  const s = saturation / 255;
  const v = value / 255;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = v - chroma;
  const [red, green, blue] = h < 60
    ? [chroma, x, 0]
    : h < 120
      ? [x, chroma, 0]
      : h < 180
        ? [0, chroma, x]
        : h < 240
          ? [0, x, chroma]
          : h < 300
            ? [x, 0, chroma]
            : [chroma, 0, x];
  return `#${[red, green, blue]
    .map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function LightingEditor(props: { via: ViaKeyboard; lighting?: string; language?: "zh" | "en" }) {
  const [effect, setEffect] = useState(0);
  const [color, setColor] = useState("#ff0000");
  const [brightness, setBrightness] = useState(128);
  const [speed, setSpeed] = useState(50);
  const [effects, setEffects] = useState<{ id: number; label: string }[]>([]);
  const [error, setError] = useState<string>();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const isZh = props.language === "zh";

  const getEffectLabel = (_id: number, defaultLabel: string, isVial: boolean) => {
    if (!isZh) return defaultLabel;
    if (isVial) {
      return VIAL_RGB_EFFECTS_ZH[defaultLabel] ?? defaultLabel;
    }
    return QMK_RGB_EFFECTS_ZH[defaultLabel] ?? defaultLabel;
  };

  const setRgbValue = async (value: { brightness?: number; effect?: number; speed?: number; hue?: number; saturation?: number }) => {
    try {
      setError(undefined);
      console.log("[Lighting] send", props.lighting, value);
      if (props.lighting === "qmk_rgblight" || props.lighting === "qmk_backlight_rgblight") {
        await props.via.SetQmkRgblight({
          brightness,
          speed,
          ...value,
        });
      } else if (props.lighting === "vialrgb") {
        await props.via.SetVialRgb({
          mode: value.effect ?? effect,
          speed,
          brightness,
          ...hexToHsv(color),
          ...value,
        });
      } else {
        throw new Error("Keyboard definition does not declare RGB lighting support");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      console.error("[Lighting] send failed", message);
      setError(message);
    }
  };

  useEffect(() => {
    if (props.lighting === "qmk_rgblight" || props.lighting === "qmk_backlight_rgblight") {
      void props.via.GetQmkRgblight().then((value) => {
        setEffects(
          QMK_RGB_EFFECTS.map((label, id) => ({
            id,
            label: getEffectLabel(id, label, false),
          }))
        );
        setEffect(value.effect);
        setBrightness(value.brightness);
        setSpeed(value.speed);
        setColor(hsvToHex(value.hue, value.saturation, value.brightness));
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    } else if (props.lighting === "vialrgb") {
      void props.via.GetVialRgb().then((value) => {
        setEffects(
          value.supportedEffects.map((id) => {
            const rawLabel = VIAL_RGB_EFFECTS[id] ?? `Effect ${id}`;
            return {
              id,
              label: getEffectLabel(id, rawLabel, true),
            };
          })
        );
        setEffect(value.mode);
        setBrightness(value.brightness);
        setSpeed(value.speed);
        setColor(hsvToHex(value.hue, value.saturation, value.brightness));
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    }
  }, [props.lighting, props.via, props.language]);

  const t = quantumTranslations[props.language ?? "en"];

  return (
    <Box sx={{ width: "100%", maxWidth: 560, p: 2 }}>
      {props.lighting === undefined && (
        <Box sx={{ color: "var(--theme-warning)", mb: 1 }}>
          {t.lighting.notSupported}
        </Box>
      )}
      {error && <Box sx={{ color: "var(--theme-error)", mb: 1 }}>{error}</Box>}
      <Box sx={{ display: "grid", gridTemplateColumns: "110px minmax(180px, 1fr)", alignItems: "center", rowGap: 1.25 }}>
        <Box component="label" htmlFor="lighting-effect" sx={{ color: "var(--theme-text-primary)", fontSize: "0.9rem" }}>
          {t.lighting.effect}
        </Box>
        <FormControl size="small" fullWidth>
          <InputLabel id="lighting-effect-label">{t.lighting.effect}</InputLabel>
          <Select
            labelId="lighting-effect-label"
            id="lighting-effect"
            value={effects.length > 0 && effects.some((item) => item.id === effect) ? effect : (effects[0]?.id ?? "")}
            label={t.lighting.effect}
            onChange={(event) => {
              const value = Number(event.target.value);
              setEffect(value);
              void setRgbValue({ effect: value });
            }}
          >
            {effects.map((item) => (
              <MenuItem key={item.id} value={item.id}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box component="label" htmlFor="lighting-color" sx={{ color: "var(--theme-text-primary)", fontSize: "0.9rem" }}>
          {t.lighting.color}
        </Box>
        <>
          <ButtonBase
            aria-label={t.lighting.chooseColor}
            onClick={() => setColorPickerOpen(true)}
            sx={{
              width: "100%",
              height: 32,
              borderRadius: 1,
              backgroundColor: color,
              border: "1px solid rgba(226, 232, 240, 0.7)",
              boxShadow: "inset 0 0 0 1px var(--theme-shadow)",
            }}
          />
          <LightingColorPicker
            open={colorPickerOpen}
            value={color}
            language={props.language}
            onCancel={() => setColorPickerOpen(false)}
            onConfirm={(value) => {
              setColor(value);
              setColorPickerOpen(false);
              void setRgbValue(hexToHsv(value));
            }}
          />
        </>

        <Box component="label" htmlFor="lighting-brightness" sx={{ color: "var(--theme-text-primary)", fontSize: "0.9rem" }}>
          {t.lighting.brightness}
        </Box>
        <Slider
          id="lighting-brightness"
          value={brightness}
          min={0}
          max={255}
          onChange={(_event, value) => {
            const nextValue = value as number;
            setBrightness(nextValue);
            void setRgbValue({ brightness: nextValue });
          }}
          valueLabelDisplay="auto"
          size="small"
        />

        <Box component="label" htmlFor="lighting-speed" sx={{ color: "var(--theme-text-primary)", fontSize: "0.9rem" }}>
          {t.lighting.speed}
        </Box>
        <Slider
          id="lighting-speed"
          value={speed}
          min={0}
          max={255}
          onChange={(_event, value) => {
            const nextValue = value as number;
            setSpeed(nextValue);
            void setRgbValue({ speed: nextValue });
          }}
          valueLabelDisplay="auto"
          size="small"
        />
      </Box>
    </Box>
  );
}
