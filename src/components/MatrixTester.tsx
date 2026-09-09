import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { DynamicEntryCount, ViaKeyboard } from "../services/vialKeyboad";
import { playKeycapLandingSound } from "./keycapAudio";
import { DefaultQmkKeycode, KeycodeConverter } from "./keycodes/keycodeConverter";
import { convertToKeymapKeys } from "./keymapLogic";
import { KEY_GAP, KeymapKeyProperties, KeymapProperties, WIDTH_1U } from "./keymapTypes";

export function MatrixTester(props: {
  keymap: KeymapProperties;
  via: ViaKeyboard;
  language: "zh" | "en";
  keymapLanguage?: string;
  dynamicEntryCount?: DynamicEntryCount;
  isActive?: boolean;
}) {
  const [layoutOption, setLayoutOption] = useState<{ [layout: number]: number }>({ 0: 0 });
  const [activeMatrixKeys, setActiveMatrixKeys] = useState<Set<string>>(new Set());
  const [testedMatrixKeys, setTestedMatrixKeys] = useState<Set<string>>(new Set());
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();
  const [layer0Keys, setLayer0Keys] = useState<number[]>([]);
  const activeKeysRef = useRef<Set<string>>(new Set());
  const testedKeysRef = useRef<Set<string>>(new Set());
  const isPollingRef = useRef(true);

  const isZh = props.language === "zh";

  // Load layout options on mount or when active
  useEffect(() => {
    if (props.isActive === false) return;
    void props.via.GetLayoutOption().then((option) => {
      setLayoutOption({ 0: option & 0xff });
    }).catch(() => {});
  }, [props.via, props.isActive]);

  // Load keycode converter and layer 0 keycodes
  useEffect(() => {
    if (props.isActive === false) return;
    KeycodeConverter.Create(
      props.dynamicEntryCount?.layer ?? 16,
      props.keymap.customKeycodes,
      props.dynamicEntryCount?.macro ?? 0,
      props.dynamicEntryCount?.tapdance ?? 0,
      props.keymapLanguage ?? "Chinese",
      "0.0.3",
      props.language,
    )
      .then((converter) => setKeycodeConverter(converter))
      .catch(() => {});

    void props.via
      .GetLayer(0, props.keymap.matrix, true)
      .then((keys) => setLayer0Keys(keys))
      .catch(() => {});
  }, [
    props.via,
    props.keymap,
    props.language,
    props.keymapLanguage,
    props.dynamicEntryCount,
    props.isActive,
  ]);

  // Fallback converter for geometry generation
  const dummyConverter = useMemo(() => {
    return {
      convertIntToKeycode: () => DefaultQmkKeycode,
    } as unknown as KeycodeConverter;
  }, []);

  // Compute key positions with layer 0 keycodes
  const keys: KeymapKeyProperties[] = useMemo(() => {
    return convertToKeymapKeys(
      props.keymap,
      layoutOption,
      layer0Keys,
      [],
      keycodeConverter ?? dummyConverter,
      {},
    );
  }, [props.keymap, layoutOption, layer0Keys, keycodeConverter, dummyConverter]);

  // Calculate layout bounds
  const rightmostPos = useMemo(() => {
    if (keys.length === 0) return 600;
    return Math.max(...keys.map((key) => key.x + key.w)) * (WIDTH_1U + KEY_GAP) + WIDTH_1U;
  }, [keys]);

  const maxRowHeight = useMemo(() => {
    if (keys.length === 0) return 200;
    return (Math.max(...keys.map((k) => k.y)) + 1.5) * (WIDTH_1U + KEY_GAP);
  }, [keys]);

  // Polling loop for switch matrix state - only runs when active
  useEffect(() => {
    if (props.isActive === false) {
      isPollingRef.current = false;
      activeKeysRef.current.clear();
      setActiveMatrixKeys(new Set());
      return;
    }

    isPollingRef.current = true;
    let timerId: number | undefined;

    const rows = props.keymap.matrix.rows;
    const cols = props.keymap.matrix.cols;
    const bytesPerRow = cols <= 8 ? 1 : cols <= 16 ? 2 : 4;

    const pollMatrix = async () => {
      if (!isPollingRef.current) return;
      try {
        if (props.via.Connected()) {
          const matrixData = await props.via.GetSwitchMatrixState(true);
          if (matrixData && matrixData.length > 0) {
            const currentActive = new Set<string>();
            const currentTested = new Set(testedKeysRef.current);

            for (let r = 0; r < rows; r++) {
              const rowOffset = r * bytesPerRow;
              if (rowOffset >= matrixData.length) break;

              let rowVal = 0;
              if (bytesPerRow === 1) {
                rowVal = matrixData[rowOffset];
              } else if (bytesPerRow === 2) {
                rowVal = (matrixData[rowOffset] << 8) | (matrixData[rowOffset + 1] ?? 0);
              } else if (bytesPerRow === 4) {
                rowVal =
                  ((matrixData[rowOffset] << 24) >>> 0) |
                  ((matrixData[rowOffset + 1] ?? 0) << 16) |
                  ((matrixData[rowOffset + 2] ?? 0) << 8) |
                  (matrixData[rowOffset + 3] ?? 0);
              }

              for (let c = 0; c < cols; c++) {
                const isDown = ((rowVal >> c) & 1) === 1;
                if (isDown) {
                  const keyId = `${r},${c}`;
                  currentActive.add(keyId);
                  if (!currentTested.has(keyId)) {
                    currentTested.add(keyId);
                    // Sound on new key press
                    playKeycapLandingSound(r * 10 + c);
                  }
                }
              }
            }

            // Check if active changed
            let activeChanged = currentActive.size !== activeKeysRef.current.size;
            if (!activeChanged) {
              for (const key of currentActive) {
                if (!activeKeysRef.current.has(key)) {
                  activeChanged = true;
                  break;
                }
              }
            }

            if (activeChanged) {
              activeKeysRef.current = currentActive;
              setActiveMatrixKeys(currentActive);
            }

            if (currentTested.size !== testedKeysRef.current.size) {
              testedKeysRef.current = currentTested;
              setTestedMatrixKeys(currentTested);
            }
          }
        }
      } catch {
        // ignore poll errors
      }

      if (isPollingRef.current) {
        timerId = window.setTimeout(pollMatrix, 40);
      }
    };

    void pollMatrix();

    return () => {
      isPollingRef.current = false;
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
    };
  }, [props.via, props.keymap.matrix, props.isActive]);

  const handleReset = () => {
    activeKeysRef.current.clear();
    testedKeysRef.current.clear();
    setActiveMatrixKeys(new Set());
    setTestedMatrixKeys(new Set());
  };

  // Layout variant options
  const labels = props.keymap.layouts.labels?.[0]?.slice(1) ?? [];
  const layoutCount = props.keymap.layouts.keymap
    .flatMap((row) => row)
    .reduce((count, key) => {
      if (typeof key !== "string") return count;
      const layout = Number(key.split("\n")[3]?.split(",")[1]);
      return Number.isInteger(layout) ? Math.max(count, layout + 1) : count;
    }, 1);
  const layoutOptionNames = labels.length > 0
    ? labels
    : layoutCount === 2
      ? ["P40", "HHKB"]
      : [...Array(layoutCount)].map((_, index) => `Layout ${index}`);

  const totalKeys = keys.length;
  const testedCount = keys.filter((k) => {
    const keyId = `${k.matrix[0]},${k.matrix[1]}`;
    return testedMatrixKeys.has(keyId);
  }).length;

  return (
    <Box sx={{ width: "100%", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Control Bar */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleReset}
            sx={{
              color: "#e2e8f0",
              borderColor: "#64748b",
              backgroundColor: "#334155",
              textTransform: "none",
              px: 2,
              py: 0.5,
              "&:hover": {
                backgroundColor: "#475569",
                borderColor: "#94a3b8",
              },
            }}
          >
            {isZh ? "重置测试" : "Reset"}
          </Button>

          {layoutOptionNames.length >= 2 && (
            <Select
              size="small"
              variant="outlined"
              value={layoutOption[0] ?? 0}
              sx={{
                color: "#e2e8f0",
                fontSize: "0.82rem",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#475569" },
              }}
              onChange={(event) => {
                setLayoutOption({ 0: Number(event.target.value) });
              }}
            >
              {layoutOptionNames.map((name, idx) => (
                <MenuItem key={name} value={idx} sx={{ fontSize: "0.82rem" }}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
            {isZh ? `已测试: ${testedCount} / ${totalKeys} 键` : `Tested: ${testedCount} / ${totalKeys} keys`}
          </Typography>
          {testedCount === totalKeys && totalKeys > 0 && (
            <Typography sx={{ fontSize: "0.85rem", color: "#4ade80", fontWeight: 600 }}>
              {isZh ? "✓ 全部通过" : "✓ All Passed"}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Matrix Surface */}
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          p: 2,
          borderRadius: 2,
          backgroundColor: "#1e2227",
          border: "1px solid #333842",
          minHeight: maxRowHeight + 20,
        }}
      >
        <Box
          sx={{
            position: "relative",
            height: `${maxRowHeight}px`,
            width: `${rightmostPos}px`,
            minWidth: "100%",
          }}
        >
          {keys.map((p, idx) => {
            const keyId = `${p.matrix[0]},${p.matrix[1]}`;
            const isActive = activeMatrixKeys.has(keyId);
            const isTested = testedMatrixKeys.has(keyId);

            let bg = "rgba(45, 50, 58, 0.9)";
            let borderColor = "#484f5c";
            let textColor = "#8fa4bd";
            let boxShadow = "none";

            if (isActive) {
              bg = "#e2e8f0";
              borderColor = "#ffffff";
              textColor = "#0f172a";
              boxShadow = "0 0 14px rgba(255, 255, 255, 0.6)";
            } else if (isTested) {
              bg = "#475569";
              borderColor = "#64748b";
              textColor = "#f8fafc";
            }

            const labelText = p.keycode.label || p.keycode.key || "";
            const isLongLabel = labelText.length > 3;

            const style: React.CSSProperties = p.r !== 0
              ? {
                  position: "absolute",
                  top: (p.ry + p.offsety) * (WIDTH_1U + KEY_GAP),
                  left: (p.rx + p.offsetx) * (WIDTH_1U + KEY_GAP),
                  width: p.w * WIDTH_1U - 4 + (p.w - 1) * KEY_GAP,
                  height: p.h * WIDTH_1U - 4,
                  transform: "var(--keymap-rotation)",
                  "--keymap-rotation": `rotate(${p.r}deg)`,
                  transformOrigin: `${-p.offsetx * (WIDTH_1U + KEY_GAP)}px ${-p.offsety * (WIDTH_1U + KEY_GAP)}px`,
                  backgroundColor: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: p.isEncoder ? "50%" : "6px",
                  boxShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textColor,
                  fontSize: isLongLabel ? "10px" : "12px",
                  fontWeight: 600,
                  userSelect: "none",
                  transition: "background-color 70ms ease, border-color 70ms ease, box-shadow 70ms ease, color 70ms ease",
                } as React.CSSProperties
              : {
                  position: "absolute",
                  top: p.y * (WIDTH_1U + KEY_GAP),
                  left: p.x * (WIDTH_1U + KEY_GAP),
                  width: p.w * WIDTH_1U - 4 + (p.w - 1) * KEY_GAP,
                  height: p.h * WIDTH_1U - 4,
                  transform: "var(--keymap-rotation)",
                  "--keymap-rotation": "rotate(0deg)",
                  backgroundColor: bg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: p.isEncoder ? "50%" : "6px",
                  boxShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: textColor,
                  fontSize: isLongLabel ? "10px" : "12px",
                  fontWeight: 600,
                  userSelect: "none",
                  transition: "background-color 70ms ease, border-color 70ms ease, box-shadow 70ms ease, color 70ms ease",
                } as React.CSSProperties;

            return (
              <div
                key={idx}
                style={style}
                title={`Row: ${p.matrix[0]}, Col: ${p.matrix[1]}${labelText ? ` (${labelText})` : ""}`}
              >
                {p.isEncoder ? (
                  <span style={{ fontSize: "14px", fontWeight: "bold" }}>
                    {p.matrix[1] === 0 ? "⌄" : "⌃"}
                  </span>
                ) : (
                  <span
                    style={{
                      maxWidth: "92%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      lineHeight: 1.1,
                    }}
                  >
                    {labelText}
                  </span>
                )}
              </div>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
