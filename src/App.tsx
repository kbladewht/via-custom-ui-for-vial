import DownloadIcon from "@mui/icons-material/Download";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import { match, P } from "ts-pattern";
import "./App.css";
import { KeyboardSelector } from "./components/KeyboardSelector";
import {
  discardPendingKeycapAudio,
  LanguageSelector,
  prepareKeycapAudio,
} from "./components/KeymapEditor";
import { QuantumSettingsEditor } from "./components/QuantumSettingsEditor";
import { ViaMenuItem } from "./components/ViaMenuItem";
import { useAppController, via } from "./useAppController";

function App() {
  const {
    vialJson,
    dynamicEntryCount,
    customMenus,
    activeMenu,
    customValues,
    setCustomValues,
    connected,
    loadedDeviceIndex,
    loading,
    setLoading,
    customEraseDialogOpen,
    quantumEraseDialogOpen,
    setQuantumEraseDialogOpen,
    vialFileInputRef,
    deviceList,
    setDeviceList,
    deviceIndex,
    setDeviceIndex,
    keymapLanguage,
    setKeymapLanguage,
    uiLanguage,
    setUiLanguage,
    batteryLevel,
    setBatteryLevel,
    currentLayer,
    setCurrentLayer,
    shortcutHelpAnchor,
    setShortcutHelpAnchor,
    shortcutHelp,
    updateDeviceList,
    openKeyboard,
    onVialSaveClick,
    onVialUploadJsonClick,
    onDfuClick,
    onVialJsonUploaded,
    onQuantumSaveClick,
    onCustomSaveClick,
    onCustomEraseClick,
    onDialogClose,
    onDialogOkClick,
    handleFileChange,
    setQuantumValues,
    setActiveMenu,
  } = useAppController();

  return (
    <>
      <Grid
        container
        spacing={2}
        id="menu"
        className="app-shell"
        sx={{ pl: 1 }}
        style={{ position: "relative", minWidth: "100vw" }}
      >
        <Grid
          item
          xs={12}
          md={12}
          className="app-main-panel"
          sx={{ pl: 0 }}
        >
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
                deviceIndex={deviceIndex}
                deviceList={deviceList}
                onChange={(idx) => {
                  setDeviceIndex(idx);
                }}
                onOpen={async () => {
                  const deviceList = await updateDeviceList();
                  setDeviceList(deviceList);
                  setDeviceIndex((currentIndex) =>
                    currentIndex ?? deviceList[0]?.index,
                  );
                }}
              />
              <Button
                className="vial-action-button"
                data-keymap-load="true"
                variant="contained"
                size="small"
                disabled={deviceIndex === undefined || loading}
                onClick={() => {
                  // clear any focused/selected key before loading to avoid mixed logic
                  window.dispatchEvent(new CustomEvent("vial-clear-focused-key"));
                  discardPendingKeycapAudio();
                  prepareKeycapAudio();
                  if (deviceIndex === undefined) return;
                  if (connected && loadedDeviceIndex === deviceIndex) {
                    window.dispatchEvent(new Event("vial-reload-keymap"));
                  } else {
                    void openKeyboard(deviceIndex);
                  }
                }}
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
              onClick={() => {
                void via
                  .GetCurrentLayer()
                  .then((layer) => {
                    if (layer !== null) setCurrentLayer(layer);
                  })
                  .catch((error) => {
                    console.warn("Could not read current layer", error);
                  });
              }}
              title="Refresh current layer"
            >
              <span style={{ opacity: 0.68 }}>Current Layer</span>
              <span style={{ color: "#86efac", fontWeight: 700 }}>
                L{currentLayer ?? "--"}
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
              <Tooltip title="BLE 快捷键">
                <IconButton
                  className="vial-action-button"
                  size="small"
                  aria-label="BLE 快捷键"
                  onClick={(event) => {
                    window.dispatchEvent(new Event("vial-shortcut-help-request"));
                    setShortcutHelpAnchor(event.currentTarget);
                  }}
                  sx={{ p: 0.5 }}
                >
                  <HelpOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Button
                className="vial-action-button"
                size="small"
                variant="contained"
                onClick={onDfuClick}
                sx={{ minWidth: 46, px: 1, py: 0.35, fontSize: "11px" }}
              >
                DFU
              </Button>
              <Popover
                open={shortcutHelpAnchor !== null}
                anchorEl={shortcutHelpAnchor}
                onClose={() => setShortcutHelpAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
              >
                <Box sx={{ p: 1.5, minWidth: 230, background: "#0f172a" }}>
                  <Typography sx={{ mb: 0.75, fontSize: "12px", fontWeight: 700 }}>
                    BLE 快捷键
                  </Typography>
                  {shortcutHelp.length === 0 ? (
                    <Typography sx={{ fontSize: "11px", color: "#94a3b8" }}>
                      暂未找到快捷键
                    </Typography>
                  ) : (
                    shortcutHelp.map((item) => (
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
                    batteryLevel === null
                      ? "正在获取电量"
                      : `电量 ${batteryLevel}%，当前层 ${currentLayer ?? "--"}`
                  }
                  onClick={() => {
                    void via
                      .GetBatteryLevel()
                      .then((level) => {
                        if (level !== null) setBatteryLevel(level);
                      })
                      .catch((error) => {
                        console.warn("Could not read Bluetooth battery level", error);
                      });
                  }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.25,
                    p: 0.5,
                  }}
                >
                  <Box
                    className={batteryLevel === null ? "battery-meter battery-waiting-icon" : "battery-meter"}
                    aria-hidden="true"
                  >
                    <Box
                      className="battery-meter-fill"
                      sx={{ width: `${batteryLevel === null ? 35 : Math.max(0, Math.min(100, batteryLevel))}%` }}
                    />
                  </Box>
                  <Typography sx={{ ml: 0.25, fontSize: "10px", color: "inherit" }}>
                    {batteryLevel === null ? "..." : `${batteryLevel}%`}
                  </Typography>
                </IconButton>
              </Tooltip>
              <LanguageSelector
                languageList={["US","zh"]}
                lang={keymapLanguage}
                onChange={(selectedLanguage) => {
                  setKeymapLanguage(selectedLanguage);
                  setUiLanguage(selectedLanguage === "zh" ? "zh" : "en");
                }}
              />
              <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", gap: 1 }} hidden={!connected}>
                <Tooltip title="下载设置">
                  <IconButton
                    className="vial-action-button"
                    aria-label="下载设置"
                    color="primary"
                    size="small"
                    onClick={onVialSaveClick}
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
                    onClick={onVialUploadJsonClick}
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
              ref={vialFileInputRef}
              style={{ display: "none" }}
              onChange={(event) => {
                handleFileChange(event, onVialJsonUploaded);
              }}
            />
          </Box>
          {match(activeMenu)
            .with(undefined, () => <></>)
            .with({ menuType: "customMenu" }, (menu) => (
              <ViaMenuItem
                {...menu.menu}
                customValues={customValues}
                onChange={async (id, value) => {
                  setCustomValues({ ...customValues, [id[0]]: value });
                  await via.SetCustomValue(id.slice(1) as number[], value);
                }}
              ></ViaMenuItem>
            ))
            .with({ menuType: "quantum" }, () => {
              return (
                <QuantumSettingsEditor
                  via={via}
                  language={uiLanguage}
                  onLanguageChange={setUiLanguage}
                  macroCount={dynamicEntryCount.macro}
                  customKeycodes={vialJson?.customKeycodes}
                  keymap={vialJson}
                  dynamicEntryCount={dynamicEntryCount}
                  keymapLanguage={keymapLanguage}
                  onSave={onQuantumSaveClick}
                  onErase={() => setQuantumEraseDialogOpen(true)}
                  customMenus={customMenus}
                  onCustomSave={onCustomSaveClick}
                  onCustomErase={onCustomEraseClick}
                  onChange={(value) => {
                    setQuantumValues(value);
                  }}
                ></QuantumSettingsEditor>
              );
            })
            .with(P._, () => <></>)
            .exhaustive()}
          {vialJson === undefined && <p></p>}
        </Grid>
      </Grid>
      <Dialog open={customEraseDialogOpen} onClose={onDialogClose}>
        <DialogContent>Erase all custom settings?</DialogContent>
        <DialogActions>
          <Button color="error" onClick={onDialogClose}>
            Cancel
          </Button>
          <Button color="primary" onClick={onDialogOkClick}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={quantumEraseDialogOpen}
        onClose={() => {
          setQuantumEraseDialogOpen(false);
        }}
      >
        <DialogContent>Erase all quantum settings?</DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => {
              setQuantumEraseDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={async () => {
              setQuantumEraseDialogOpen(false);
              setLoading(true);
              try {
                await via.EraseQuantumSettingsValue();
              } finally {
                setLoading(false);
              }
              setActiveMenu(undefined);
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default App;
