import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useEffect, useState } from "react";
import quantumTranslations from "../locales/quantum.json";

const PRESET_COLORS = [
  "#000000", "#8b0000", "#006400", "#8b4513", "#008000", "#808000", "#00ff00", "#ffff00",
  "#00008b", "#800080", "#008080", "#bc8f8f", "#00a080", "#bdb76b", "#00ffff", "#ccffcc",
  "#0000ff", "#ff00ff", "#4169e1", "#ee82ee", "#00bfff", "#d8bfd8", "#40e0d0", "#f0ffff",
  "#800000", "#ff0000", "#ff4500", "#ff6347", "#66cc00", "#ffa500", "#00ff80", "#ffff80",
];

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "").padEnd(6, "0");
  return {
    r: Number.parseInt(value.slice(0, 2), 16) || 0,
    g: Number.parseInt(value.slice(2, 4), 16) || 0,
    b: Number.parseInt(value.slice(4, 6), 16) || 0,
  };
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta !== 0) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6);
    else if (max === green) h = 60 * ((blue - red) / delta + 2);
    else h = 60 * ((red - green) / delta + 4);
  }
  return { h: h < 0 ? h + 360 : h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const saturation = s / 100;
  const value = v / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - chroma;
  const [red, green, blue] = h < 60 ? [chroma, x, 0] : h < 120 ? [x, chroma, 0] : h < 180 ? [0, chroma, x] : h < 240 ? [0, x, chroma] : h < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return { r: Math.round((red + m) * 255), g: Math.round((green + m) * 255), b: Math.round((blue + m) * 255) };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

export function LightingColorPicker(props: {
  open: boolean;
  value: string;
  language?: "zh" | "en";
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [hsv, setHsv] = useState<Hsv>({ h: 0, s: 100, v: 100 });
  const [rgb, setRgb] = useState<Rgb>({ r: 255, g: 0, b: 0 });
  const [draftHex, setDraftHex] = useState(props.value);
  const t = quantumTranslations[props.language ?? "en"];
  const labels = t.colorPicker;

  useEffect(() => {
    if (!props.open) return;
    const nextRgb = hexToRgb(props.value);
    setRgb(nextRgb);
    setHsv(rgbToHsv(nextRgb));
    setDraftHex(rgbToHex(nextRgb));
  }, [props.open, props.value]);

  const updateRgb = (nextRgb: Rgb) => {
    const normalized = { r: clamp(nextRgb.r), g: clamp(nextRgb.g), b: clamp(nextRgb.b) };
    setRgb(normalized);
    setHsv(rgbToHsv(normalized));
    setDraftHex(rgbToHex(normalized));
  };

  const updateHsv = (nextHsv: Hsv) => {
    const normalized = { h: clamp((nextHsv.h + 360) % 360, 0, 360), s: clamp(nextHsv.s, 0, 100), v: clamp(nextHsv.v, 0, 100) };
    setHsv(normalized);
    setRgb(hsvToRgb(normalized));
    setDraftHex(rgbToHex(hsvToRgb(normalized)));
  };

  const selectPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    updateHsv({ ...hsv, s: ((event.clientX - bounds.left) / bounds.width) * 100, v: 100 - ((event.clientY - bounds.top) / bounds.height) * 100 });
  };

  return (
    <Dialog open={props.open} onClose={props.onCancel} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundColor: "#0f172a", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 2 } }}>
      <DialogTitle sx={{ display: "none" }}>Select Color</DialogTitle>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "minmax(150px, 1fr) 28px 150px", gap: 2, alignItems: "start", mt: 1 }}>
          <Box>
            <Box sx={{ color: "text.secondary", mb: 1 }}>{labels.basicColors}</Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 0.75 }}>
              {PRESET_COLORS.map((preset) => (
                <Box key={preset} onClick={() => updateRgb(hexToRgb(preset))} sx={{ aspectRatio: "1", cursor: "pointer", backgroundColor: preset, border: "1px solid rgba(255,255,255,.45)", borderRadius: 0.5 }} />
              ))}
            </Box>
          </Box>
          <Box sx={{ height: 220, width: 20, cursor: "pointer", border: "1px solid rgba(255,255,255,.5)", background: `linear-gradient(to bottom, ${rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }))}, #000)` }} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); updateHsv({ ...hsv, v: 100 - ((event.clientY - bounds.top) / bounds.height) * 100 }); }} />
          <Box sx={{ display: "grid", gap: 1 }}>
            <Box sx={{ height: 220, cursor: "crosshair", position: "relative", background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsv.h} 100% 50%)` }} onClick={selectPoint}>
              <Box sx={{ position: "absolute", width: 14, height: 14, border: "2px solid white", borderRadius: "50%", left: `calc(${hsv.s}% - 7px)`, top: `calc(${100 - hsv.v}% - 7px)`, boxShadow: "0 0 0 1px #111" }} />
            </Box>
            <TextField size="small" label={labels.hex} value={draftHex} onChange={(event) => { setDraftHex(event.target.value); if (/^#[0-9a-f]{6}$/i.test(event.target.value)) updateRgb(hexToRgb(event.target.value)); }} />
          </Box>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1, mt: 1.5 }}>
          {([
            [labels.hue, "h"],
            [labels.red, "r"],
            [labels.saturation, "s"],
            [labels.green, "g"],
            [labels.value, "v"],
            [labels.blue, "b"],
          ] as const).map(([label, key]) => (
            <TextField
              key={key}
              size="small"
              label={label}
              type="number"
              value={key === "h" || key === "s" || key === "v" ? Math.round(hsv[key]) : rgb[key]}
              onChange={(event) => key === "h" || key === "s" || key === "v"
                ? updateHsv({ ...hsv, [key]: Number(event.target.value) })
                : updateRgb({ ...rgb, [key]: Number(event.target.value) })}
              sx={{ "& .MuiInputBase-root": { color: "#e2e8f0" }, "& .MuiInputLabel-root": { color: "#94a3b8" }, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#64748b" } }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={props.onCancel}
          sx={{
            width: 64,
            minWidth: 64,
            px: 1,
            py: 0.35,
            fontSize: "11px",
            color: "#cbd5e1",
            borderColor: "#64748b",
            "&:hover": { borderColor: "#cbd5e1", backgroundColor: "rgba(148, 163, 184, 0.12)" },
          }}
        >
          {labels.cancel}
        </Button>
        <Button variant="contained" onClick={() => props.onConfirm(rgbToHex(rgb))} sx={{ width: 64, minWidth: 64, px: 1, py: 0.35, fontSize: "11px" }}>
          {labels.ok}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
