import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Grid,
} from "@mui/material";
import { match, P } from "ts-pattern";
import { useState } from "react";
import "./App.css";
import { AppToolbar, KeymapStyle } from "./components/AppToolbar";
import {
  discardPendingKeycapAudio,
  prepareKeycapAudio,
} from "./components/KeymapEditor";
import { QuantumSettingsEditor } from "./components/QuantumSettingsEditor";
import { ViaMenuItem } from "./components/ViaMenuItem";
import { useAppController, via } from "./useAppController";

function App() {
  const [keymapStyle, setKeymapStyle] = useState<KeymapStyle>("classic");

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
        className={`app-shell keymap-style-${keymapStyle}`}
        sx={{ pl: 1 }}
        style={{ position: "relative", minWidth: "100vw" }}
      >
        <Grid item xs={12} md={12} className="app-main-panel" sx={{ pl: 0 }}>
          <AppToolbar
            keymapStyle={keymapStyle}
            onKeymapStyleChange={setKeymapStyle}
            deviceIndex={deviceIndex}
            deviceList={deviceList}
            onDeviceChange={setDeviceIndex}
            onDeviceSelectorOpen={async () => {
              const devices = await updateDeviceList();
              setDeviceList(devices);
              setDeviceIndex((currentIndex) => currentIndex ?? devices[0]?.index);
            }}
            loading={loading}
            connected={connected}
            loadedDeviceIndex={loadedDeviceIndex}
            onLoad={() => {
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
            currentLayer={currentLayer}
            onRefreshLayer={() => {
              void via
                .GetCurrentLayer()
                .then((layer) => {
                  if (layer !== null) setCurrentLayer(layer);
                })
                .catch((error) => {
                  console.warn("Could not read current layer", error);
                });
            }}
            shortcutHelpAnchor={shortcutHelpAnchor}
            onShortcutHelpOpen={(event) => {
              window.dispatchEvent(new Event("vial-shortcut-help-request"));
              setShortcutHelpAnchor(event.currentTarget);
            }}
            onShortcutHelpClose={() => setShortcutHelpAnchor(null)}
            shortcutHelp={shortcutHelp}
            onDfu={onDfuClick}
            batteryLevel={batteryLevel}
            onRefreshBattery={() => {
              void via
                .GetBatteryLevel()
                .then((level) => {
                  if (level !== null) setBatteryLevel(level);
                })
                .catch((error) => {
                  console.warn("Could not read Bluetooth battery level", error);
                });
            }}
            keymapLanguage={keymapLanguage}
            onLanguageChange={(selectedLanguage) => {
              setKeymapLanguage(selectedLanguage);
              setUiLanguage(selectedLanguage === "zh" ? "zh" : "en");
            }}
            connectedSettingsVisible={connected}
            onDownloadSettings={onVialSaveClick}
            onUploadSettings={onVialUploadJsonClick}
            vialFileInputRef={vialFileInputRef}
            onFileChange={(event) => handleFileChange(event, onVialJsonUploaded)}
          />
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
            .with({ menuType: "quantum" }, () => (
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
                onChange={setQuantumValues}
              />
            ))
            .with(P._, () => <></>)
            .exhaustive()}
          {vialJson === undefined && <p></p>}
        </Grid>
      </Grid>
      <Dialog open={customEraseDialogOpen} onClose={onDialogClose}>
        <DialogContent>Erase all custom settings?</DialogContent>
        <DialogActions>
          <Button color="error" onClick={onDialogClose}>Cancel</Button>
          <Button color="primary" onClick={onDialogOkClick}>OK</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={quantumEraseDialogOpen}
        onClose={() => setQuantumEraseDialogOpen(false)}
      >
        <DialogContent>Erase all quantum settings?</DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => setQuantumEraseDialogOpen(false)}>
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
