import DownloadIcon from "@mui/icons-material/Download";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LightModeIcon from "@mui/icons-material/LightMode";
import LinkIcon from "@mui/icons-material/Link";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChangeEvent, MouseEvent, RefObject } from "react";
import quantumTranslations from "../locales/quantum.json";
import { isSlaveDeviceType } from "../services/vialKeyboad";
import { KeyboardSelector } from "./KeyboardSelector";
import { LanguageSelector } from "./LanguageSelector";

/**
 * 解析固件上报的电量字节。
 * 分体键盘的双电量响应里，没在工作/没上报数据的那一半通常是 0，个别固件用 0xff（>100）；
 * 这些值都不是真实电量，统一按“无数据”处理（返回 null），
 * 界面才能区分“这一半有数据”和“这一半没有数据”（例如只有右半边有数据 → R 已连接）。
 */
const parseBatteryLevel = (
  value: number | null | undefined,
  zeroMeansUnknown: boolean,
): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const level = Math.round(value);
  if (level < 0 || level > 100) return null;
  if (zeroMeansUnknown && level === 0) return null;
  return level;
};

export type KeymapStyle =
  | "classic"
  | "mx"
  | "sculpted"
  | "matrix-tester";

type AppToolbarProps = {
  keymapStyle: KeymapStyle;
  onKeymapStyleChange: (style: KeymapStyle) => void;
  lightTheme: boolean;
  onThemeToggle: () => void;
  deviceIndex: number | undefined;
  deviceList: Array<{ index: number; name: string; connection: "usb" | "ble" }>;
  onDeviceChange: (index: number | undefined) => void;
  onDeviceSelectorOpen: () => Promise<void>;
  loading: boolean;
  connected: boolean;
  loadedDeviceIndex: number | undefined;
  onLoad: () => void;
  currentLayer: number | null;
  onRefreshLayer: () => void;
  shortcutHelpAnchor: HTMLElement | null;
  onShortcutHelpOpen: (event: MouseEvent<HTMLElement>) => void;
  onShortcutHelpClose: () => void;
  shortcutHelp: Array<{ name: string; label: string; shortcut: string }>;
  onDfu: () => void;
  onReset: () => void;
  onClearBonds: () => void;
  batteryLevel: number | null;
  batteryLevels?: [number | null, number | null] | null;
  onRefreshBattery: () => void;
  keymapLanguage: string;
  onLanguageChange: (language: string) => void;
  language?: "zh" | "en";
  connectedSettingsVisible: boolean;
  onDownloadSettings: () => void;
  onUploadSettings: () => void;
  vialFileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  deviceType?: string;
};

export function AppToolbar(props: AppToolbarProps) {
  const splitBatteryLevels: [number | null, number | null] | null =
    Array.isArray(props.batteryLevels) && props.batteryLevels.length === 2
      ? [
          parseBatteryLevel(props.batteryLevels?.[0], true),
          parseBatteryLevel(props.batteryLevels?.[1], true),
        ]
      : null;
  const t = quantumTranslations[props.language ?? "en"].toolbar;
  const isSlaveDevice = isSlaveDeviceType(props.deviceType);
  // 整机只有一个电量值时，0% 是合法读数；只有分体键盘的“半边”才把 0 当成未上报。
  const singleBatteryLevel = parseBatteryLevel(props.batteryLevel, false);
  const leftBatteryLevel = splitBatteryLevels ? splitBatteryLevels[0] : singleBatteryLevel;
  const rightBatteryLevel = splitBatteryLevels ? splitBatteryLevels[1] : null;
  // 左半区没有数据、右半区有数据 → 说明当前工作/连上的是右半边（右手侧）。
  const rightBatteryOnly = rightBatteryLevel !== null && leftBatteryLevel === null;
  const batteryLabel = splitBatteryLevels
    ? t.batteryBoth
      .replace("{left}", String(leftBatteryLevel ?? "--"))
      .replace("{right}", String(rightBatteryLevel ?? "--"))
    : singleBatteryLevel === null
      ? t.batteryLoading
      : t.batterySingle
        .replace("{level}", String(singleBatteryLevel))
        .replace("{layer}", String(props.currentLayer ?? "--"));
  const showConnectionStatus =
    props.connected && !isSlaveDevice && (leftBatteryLevel !== null || rightBatteryLevel !== null);
  const connectionLabel = rightBatteryOnly ? t.connectedRight : t.connected;
  const batterySummary = splitBatteryLevels
    ? `L ${leftBatteryLevel ?? "--"}% / R ${rightBatteryLevel ?? "--"}%`
    : `${singleBatteryLevel ?? "--"}%`;

  return (
    <Box
      className="app-toolbar"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        p: "0 8px 4px !important",
        minWidth: 0,
        background: "transparent !important",
        border: "0 !important",
        boxShadow: "none !important",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flex: "1 1 auto",
          minWidth: 0,
          maxWidth: 560,
        }}
      >
        <KeyboardSelector
          deviceIndex={props.deviceIndex}
          deviceList={props.deviceList}
          onChange={props.onDeviceChange}
          onOpen={props.onDeviceSelectorOpen}
        />
        <Button
          className="vial-action-button"
          data-keymap-load="true"
          variant="contained"
          size="small"
          disabled={props.deviceIndex === undefined || props.loading}
          onClick={props.onLoad}
          sx={{
            ml: 1,
            my: 0,
            alignSelf: "center",
            minWidth: 46,
            px: 1,
            py: 0.35,
            fontSize: "11px",
          }}
        >
          {t.load}
        </Button>
        {isSlaveDevice && (
          <Typography
            className="device-type-label"
            title={`${t.deviceType}: ${t.deviceSlave}`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              ml: 1,
              px: 1,
              py: 0.25,
              borderRadius: 1.5,
              border: "1px solid rgba(74, 222, 128, 0.45)",
              background: "rgba(30, 41, 59, 0.72)",
              fontSize: "11px",
              lineHeight: 1.6,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span style={{ opacity: 0.68 }}>{t.deviceType}:</span>
            <span style={{ color: "#4ade80", fontWeight: 700 }}>{t.deviceSlave}</span>
          </Typography>
        )}
        {!isSlaveDevice && (
          <Typography
            className="current-layer-pill"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              ml: 1,
              minWidth: 0,
              overflow: "hidden",
              fontSize: "11px",
              color: "rgba(203, 213, 225, 0.9)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              px: 1,
              py: 0.45,
              border: "1px solid rgba(148, 163, 184, 0.28)",
              borderRadius: 1.5,
              background: "rgba(30, 41, 59, 0.72)",
              transition: "border-color 160ms ease, background 160ms ease",
              "&:hover": {
                borderColor: "rgba(134, 239, 172, 0.65)",
                background: "rgba(30, 64, 52, 0.78)",
              },
            }}
            onClick={props.onRefreshLayer}
            title={t.refreshCurrentLayer}
          >
            <span style={{ opacity: 0.68 }}>{t.currentLayer}</span>
            <span style={{ color: "#86efac", fontWeight: 700 }}>L{props.currentLayer ?? "--"}</span>
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          flexShrink: 0,
          gap: 1,
          whiteSpace: "nowrap",
        }}
      >
        {!isSlaveDevice && (
          <>
            <Select
              size="small"
              value={props.keymapStyle}
              onChange={(event) => props.onKeymapStyleChange(event.target.value as KeymapStyle)}
              sx={{
                minWidth: 140,
                height: 32,
                fontSize: "11px",
                color: "#e2e8f0",
                background: "rgba(15, 23, 42, 0.85)",
                borderRadius: 1.5,
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.28)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(148, 163, 184, 0.45)",
                },
                "& .MuiSelect-select": {
                  py: 0.5,
                  pr: 2,
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    background: "#0f172a",
                    color: "#e2e8f0",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    mt: 0.5,
                  },
                },
              }}
            >
              <MenuItem value="classic" sx={{ fontSize: "11px" }}>
                {t.styleDefault}
              </MenuItem>
              <MenuItem value="mx" sx={{ fontSize: "11px" }}>
                MX
              </MenuItem>
              <MenuItem value="sculpted" sx={{ fontSize: "11px" }}>
                {t.styleSculpted}
              </MenuItem>
              <MenuItem value="matrix-tester" sx={{ fontSize: "11px" }}>
                {t.styleMatrixTester}
              </MenuItem>
            </Select>
            <Tooltip title={props.lightTheme ? t.themeToDark : t.themeToLight}>
              <IconButton
                className="vial-action-button theme-toggle-button"
                size="small"
                aria-label={props.lightTheme ? t.themeToDark : t.themeToLight}
                onClick={props.onThemeToggle}
                sx={{ p: 0.5 }}
              >
                {props.lightTheme ? (
                  <DarkModeIcon sx={{ fontSize: 18 }} />
                ) : (
                  <LightModeIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={t.bleShortcuts}>
              <IconButton
                className="vial-action-button"
                size="small"
                aria-label={t.bleShortcuts}
                onClick={props.onShortcutHelpOpen}
                sx={{ p: 0.5 }}
              >
                <HelpOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
        <Button
          className="vial-action-button"
          size="small"
          variant="contained"
          onClick={props.onDfu}
          sx={{ minWidth: 46, px: 1, py: 0.35, fontSize: "11px" }}
        >
          DFU
        </Button>
        <Button
          className="vial-action-button"
          size="small"
          variant="contained"
          aria-label={t.resetKeyboard}
          onClick={props.onReset}
          sx={{ minWidth: 46, px: 1, py: 0.35, fontSize: "11px", whiteSpace: "nowrap" }}
        >
          {t.resetKeyboard}
        </Button>
        <Button
          className="vial-action-button"
          size="small"
          variant="contained"
          aria-label={t.clearBonds}
          onClick={props.onClearBonds}
          sx={{ minWidth: 46, px: 1, py: 0.35, fontSize: "11px", whiteSpace: "nowrap" }}
        >
          {t.clearBonds}
        </Button>
        <Popover
          open={props.shortcutHelpAnchor !== null}
          anchorEl={props.shortcutHelpAnchor}
          onClose={props.onShortcutHelpClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
          <Box sx={{ p: 1.5, minWidth: 230, background: "#0f172a" }}>
            <Typography sx={{ mb: 0.75, fontSize: "12px", fontWeight: 700 }}>
              {t.bleShortcuts}
            </Typography>
            {props.shortcutHelp.length === 0 ? (
              <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>{t.noShortcuts}</Typography>
            ) : (
              props.shortcutHelp.map((item) => (
                <Typography key={item.name} sx={{ fontSize: "11px", color: "#cbd5e1" }}>
                  {item.label}: {item.shortcut}
                </Typography>
              ))
            )}
          </Box>
        </Popover>
        {!isSlaveDevice && (
          <>
            {showConnectionStatus && (
              <Typography
                className="connection-status-chip"
                title={`${connectionLabel} · ${batterySummary}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1.5,
                  border: "1px solid rgba(74, 222, 128, 0.45)",
                  background: "rgba(30, 41, 59, 0.72)",
                  color: "#4ade80",
                  fontSize: "11px",
                  lineHeight: 1.6,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <LinkIcon sx={{ fontSize: 13 }} />
                <span style={{ fontWeight: 700 }}>{connectionLabel}</span>
              </Typography>
            )}
            <Tooltip title={batteryLabel}>
              <IconButton
                className="battery-status-button"
                size="small"
                aria-label={batteryLabel}
                onClick={props.onRefreshBattery}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: splitBatteryLevels ? 0.5 : 0.25,
                  p: 0.5,
                }}
              >
                {splitBatteryLevels ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {splitBatteryLevels.map((level, index) => (
                      <Box
                        key={index === 0 ? "left" : "right"}
                        title={index === 0 ? t.batteryLeft : t.batteryRight}
                        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
                      >
                        <Typography
                          sx={{
                            fontSize: "9px",
                            fontWeight: 700,
                            lineHeight: 1,
                            opacity: 0.72,
                            color: "inherit",
                          }}
                        >
                          {index === 0 ? "L" : "R"}
                        </Typography>
                        <Box
                          className={
                            level === null ? "battery-meter battery-waiting-icon" : "battery-meter"
                          }
                          aria-hidden="true"
                        >
                          <Box
                            className="battery-meter-fill"
                            sx={{
                              width: `${level === null ? 35 : Math.max(0, Math.min(100, level))}%`,
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: "10px", color: "inherit" }}>
                          {level === null ? "..." : `${level}%`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
                    <Box
                      className={
                        singleBatteryLevel === null
                          ? "battery-meter battery-waiting-icon"
                          : "battery-meter"
                      }
                      aria-hidden="true"
                    >
                      <Box
                        className="battery-meter-fill"
                        sx={{
                          width: `${singleBatteryLevel === null ? 35 : Math.max(0, Math.min(100, singleBatteryLevel))}%`,
                        }}
                      />
                    </Box>
                    <Typography sx={{ ml: 0.25, fontSize: "10px", color: "inherit" }}>
                      {singleBatteryLevel === null ? "..." : `${singleBatteryLevel}%`}
                    </Typography>
                  </Box>
                )}
              </IconButton>
            </Tooltip>
            <LanguageSelector
              languageList={["US", "zh"]}
              lang={props.keymapLanguage}
              language={props.language}
              onChange={props.onLanguageChange}
            />
            <Box
              sx={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 1 }}
              hidden={!props.connectedSettingsVisible}
            >
              <Tooltip title={t.downloadSettings}>
                <IconButton
                  className="vial-action-button"
                  aria-label={t.downloadSettings}
                  color="primary"
                  size="small"
                  onClick={props.onDownloadSettings}
                  sx={{ p: 0.5 }}
                >
                  <DownloadIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t.uploadSettings}>
                <IconButton
                  className="vial-action-button"
                  aria-label={t.uploadSettings}
                  color="primary"
                  size="small"
                  onClick={props.onUploadSettings}
                  sx={{ p: 0.5 }}
                >
                  <UploadIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>
      <input
        type="file"
        accept=".json"
        ref={props.vialFileInputRef}
        style={{ display: "none" }}
        onChange={props.onFileChange}
      />
    </Box>
  );
}
