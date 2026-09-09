import { Box, FormControl, InputLabel, MenuItem, Select, Slider } from "@mui/material";
import { useState } from "react";
import { MuiColorInput, MuiColorInputColors } from "mui-color-input";

const EFFECTS = ["Disable", "Solid Color", "Breathing", "Rainbow", "Snake"];

export function LightingEditor() {
  const [effect, setEffect] = useState(EFFECTS[0]);
  const [color, setColor] = useState("#ff0000");
  const [brightness, setBrightness] = useState(128);
  const [speed, setSpeed] = useState(50);

  return (
    <Box sx={{ width: "100%", maxWidth: 560, p: 2 }}>
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
            onChange={(event) => setEffect(event.target.value)}
          >
            {EFFECTS.map((item) => (
              <MenuItem key={item} value={item}>
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
          onChange={(value: string, _colors: MuiColorInputColors) => setColor(value)}
        />

        <Box component="label" htmlFor="lighting-brightness" sx={{ color: "#e5eefb", fontSize: "0.9rem" }}>
          RGB Brightness
        </Box>
        <Slider
          id="lighting-brightness"
          value={brightness}
          min={0}
          max={255}
          onChange={(_event, value) => setBrightness(value as number)}
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
          onChange={(_event, value) => setSpeed(value as number)}
          valueLabelDisplay="auto"
          size="small"
        />
      </Box>
    </Box>
  );
}
