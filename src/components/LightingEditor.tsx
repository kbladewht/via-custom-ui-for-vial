import { Box, FormControl, InputLabel, MenuItem, Select, Slider } from "@mui/material";
import { useEffect, useState } from "react";
import { MuiColorInput } from "mui-color-input";
import { ViaKeyboard } from "../services/vialKeyboad";

const EFFECTS = ["Disable", "Solid Color", "Breathing", "Rainbow", "Snake"];

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
        setEffect(value.effect);
        setBrightness(value.brightness);
        setSpeed(value.speed);
      }).catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
    } else if (props.lighting === "vialrgb") {
      void props.via.GetVialRgb().then((value) => {
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
            {EFFECTS.map((item, index) => (
              <MenuItem key={item} value={index}>
                {item}
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
