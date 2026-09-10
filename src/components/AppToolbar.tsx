import DownloadIcon from "@mui/icons-material/Download";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
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
import { KeyboardSelector } from "./KeyboardSelector";
import { LanguageSelector } from "./LanguageSelector";

export type KeymapStyle =
  | "classic"
  | "3d"
  | "mx"
  | "sculpted"
  | "matrix"
  | "matrix-tester";

type AppToolbarProps = {
  keymapStyle: KeymapStyle;
  onKeymapStyleChange: (style: KeymapStyle) => void;
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
  batteryLevel: number | null;
  onRefreshBattery: () => void;
  keymapLanguage: string;
  onLanguageChange: (language: string) => void;
  connectedSettingsVisible: boolean;
  onDownloadSettings: () => void;
  onUploadSettings: () => void;
  vialFileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function AppToolbar(props: AppToolbarProps) {
  return (
    <Box
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
          maxWidth: 420,
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
          Load
        </Button>
      </Box>
      <Typography
        sx={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "11px",
          color: "rgba(203, 213, 225, 0.9)",
          whiteSpace: "nowrap",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
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
        title="Refresh current layer"
      >
        <span style={{ opacity: 0.68 }}>Current Layer</span>
        <span style={{ color: "#86efac", fontWeight: 700 }}>
          L{props.currentLayer ?? "--"}
        </span>
      </Typography>
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
          <MenuItem value="classic" sx={{ fontSize: "11px" }}>Default</MenuItem>
          <MenuItem value="3d" sx={{ fontSize: "11px" }}>3D</MenuItem>
          <MenuItem value="mx" sx={{ fontSize: "11px" }}>MX</MenuItem>
          <MenuItem value="sculpted" sx={{ fontSize: "11px" }}>Sculpted</MenuItem>
          <MenuItem value="matrix" sx={{ fontSize: "11px" }}>Matrix</MenuItem>
          <MenuItem value="matrix-tester" sx={{ fontSize: "11px" }}>Matrix Tester</MenuItem>
        </Select>
        <Tooltip title="BLE 快捷键">
          <IconButton
            className="vial-action-button"
            size="small"
            aria-label="BLE 快捷键"
            onClick={props.onShortcutHelpOpen}
            sx={{ p: 0.5 }}
          >
            <HelpOutlineIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Button
          className="vial-action-button"
          size="small"
          variant="contained"
          onClick={props.onDfu}
          sx={{ minWidth: 46, px: 1, py: 0.35, fontSize: "11px" }}
        >
          DFU
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
              BLE 快捷键
            </Typography>
            {props.shortcutHelp.length === 0 ? (
              <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                暂未找到快捷键
              </Typography>
            ) : (
              props.shortcutHelp.map((item) => (
                <Typography key={item.name} sx={{ fontSize: "11px", color: "#cbd5e1" }}>
                  {item.label}: {item.shortcut}
                </Typography>
              ))
            )}
          </Box>
        </Popover>
        <Tooltip title="刷新电量">
          <IconButton
            className="battery-status-button"
            size="small"
            aria-label={
              props.batteryLevel === null
                ? "正在获取电量"
                : `电量 ${props.batteryLevel}%，当前层 ${props.currentLayer ?? "--"}`
            }
            onClick={props.onRefreshBattery}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, p: 0.5 }}
          >
            <Box
              className={props.batteryLevel === null ? "battery-meter battery-waiting-icon" : "battery-meter"}
              aria-hidden="true"
            >
              <Box
                className="battery-meter-fill"
                sx={{ width: `${props.batteryLevel === null ? 35 : Math.max(0, Math.min(100, props.batteryLevel))}%` }}
              />
            </Box>
            <Typography sx={{ ml: 0.25, fontSize: "10px", color: "inherit" }}>
              {props.batteryLevel === null ? "..." : `${props.batteryLevel}%`}
            </Typography>
          </IconButton>
        </Tooltip>
        <LanguageSelector
          languageList={["US", "zh"]}
          lang={props.keymapLanguage}
          onChange={props.onLanguageChange}
        />
        <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 1 }} hidden={!props.connectedSettingsVisible}>
          <Tooltip title="下载设置">
            <IconButton
              className="vial-action-button"
              aria-label="下载设置"
              color="primary"
              size="small"
              onClick={props.onDownloadSettings}
              sx={{ p: 0.5 }}
            >
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="上传设置">
            <IconButton
              className="vial-action-button"
              aria-label="上传设置"
              color="primary"
              size="small"
              onClick={props.onUploadSettings}
              sx={{ p: 0.5 }}
            >
              <UploadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
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
