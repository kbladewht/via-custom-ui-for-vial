import { Box, FormControl, InputLabel, MenuItem, Select, Slider } from "@mui/material";
import { useEffect, useState } from "react";
import { MuiColorInput } from "mui-color-input";
import { ViaKeyboard } from "../services/vialKeyboad";

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

const QMK_RGB_EFFECTS = [
  "All Off", "Solid Color", "Breathing 1", "Breathing 2", "Breathing 3", "Breathing 4",
  "Rainbow Mood 1", "Rainbow Mood 2", "Rainbow Mood 3", "Rainbow Swirl 1", "Rainbow Swirl 2",
  "Rainbow Swirl 3", "Rainbow Swirl 4", "Rainbow Swirl 5", "Rainbow Swirl 6", "Snake 1",
  "Snake 2", "Snake 3", "Snake 4", "Snake 5", "Snake 6", "Knight 1", "Knight 2", "Knight 3",
  "Christmas", "Gradient 1", "Gradient 2", "Gradient 3", "Gradient 4", "Gradient 5", "Gradient 6",
  "Gradient 7", "Gradient 8", "Gradient 9", "Gradient 10", "RGB Test", "Alternating",
];

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

export function LightingEditor(props: { via: ViaKeyboard; lighting?: string }) {
  const [effect, setEffect] = useState(0);
  const [color, setColor] = useState("#ff0000");
  const [brightness, setBrightness] = useState(128);
  const [speed, setSpeed] = useState(50);
  const [effects, setEffects] = useState<{ id: number; label: string }[]>([]);
  const [error, setError] = useState<string>();

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
        setEffects(QMK_RGB_EFFECTS.map((label, id) => ({ id, label })));
        setEffect(value.effect);
        setBrightness(value.brightness);
        setSpeed(value.speed);
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    } else if (props.lighting === "vialrgb") {
      void props.via.GetVialRgb().then((value) => {
        setEffects(value.supportedEffects.map((id) => ({
          id,
          label: VIAL_RGB_EFFECTS[id] ?? `Effect ${id}`,
        })));
        setEffect(value.mode);
        setBrightness(value.brightness);
        setSpeed(value.speed);
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    }
  }, [props.lighting, props.via]);

  return (
    <Box sx={{ width: "100%", maxWidth: 560, p: 2 }}>
      {props.lighting === undefined && (
        <Box sx={{ color: "#fbbf24", mb: 1 }}>Keyboard lighting is not declared in its Vial definition.</Box>
      )}
      {error && <Box sx={{ color: "#f87171", mb: 1 }}>{error}</Box>}
      <Box sx={{ display: "grid", gridTemplateColumns: "110px minmax(180px, 1fr)", alignItems: "center", rowGap: 1.25 }}>
        <Box component="label" htmlFor="lighting-effect" sx={{ color: "#e5eefb", fontSize: "0.9rem" }}>
          RGB Effect
        </Box>
        <FormControl size="small" fullWidth>
          <InputLabel id="lighting-effect-label">RGB Effect</InputLabel>
          <Select
            labelId="lighting-effect-label"
            id="lighting-effect"
            value={effect}
            label="RGB Effect"
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

        <Box component="label" htmlFor="lighting-color" sx={{ color: "#e5eefb", fontSize: "0.9rem" }}>
          RGB Color
        </Box>
        <MuiColorInput
          id="lighting-color"
          value={color}
          format="hex"
          size="small"
          onChange={(value: string) => {
            setColor(value);
            void setRgbValue(hexToHsv(value));
          }}
        />

        <Box component="label" htmlFor="lighting-brightness" sx={{ color: "#e5eefb", fontSize: "0.9rem" }}>
          RGB Brightness
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

        <Box component="label" htmlFor="lighting-speed" sx={{ color: "#e5eefb", fontSize: "0.9rem" }}>
          RGB Speed
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
