import DownloadIcon from "@mui/icons-material/Download";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import UploadIcon from "@mui/icons-material/Upload";
import { invoke } from "@tauri-apps/api/core";
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
import * as Hjson from "hjson";
import { useEffect, useRef, useState } from "react";
import { match, P } from "ts-pattern";
import "./App.css";
import { KeyboardSelector } from "./components/KeyboardSelector";
import { KeymapProperties, LanguageSelector } from "./components/KeymapEditor";
import { QuantumSettingsEditor } from "./components/QuantumSettingsEditor";
import { MenuItemProperties, MenuSectionProperties, ViaMenuItem } from "./components/ViaMenuItem";
import init, { xz_decompress } from "./pkg";
import { QuantumSettingDefinition } from "./services/quantumSettings";
import {
  ConnectionType,
  DynamicEntryCount,
  ViaKeyboard,
  VialDefinition,
} from "./services/vialKeyboad";
import {
  VialKeyboardConfig,
  VialKeyboardGetAllConfig,
  VialKeyboardSetAllConfig,
} from "./services/vialKeyboardConfig";

const isTauri = import.meta.env.TAURI_ENV_PLATFORM !== undefined;

if (!isTauri && !navigator.hid && !navigator.bluetooth) {
  alert("Please use browser with WebHID or WebBluetooth support");
}

const via = new ViaKeyboard(
  isTauri || navigator.hid !== undefined,
  navigator.bluetooth !== undefined,
);

function App() {
  const [vialJson, setVialJson] = useState<VialDefinition | undefined>(undefined);
  const [dynamicEntryCount, setDynamicEntryCount] = useState<DynamicEntryCount>({
    layer: 0,
    macro: 0,
    tapdance: 0,
    combo: 0,
    override: 0,
  });
  const [customMenus, setCustomMenus] = useState<MenuItemProperties[]>([]);
  const [activeMenu, setActiveMenu] = useState<
    | {
        menuType: "customMenu";
        menu: MenuSectionProperties;
      }
    | {
        menuType: "keymap";
        menu: KeymapProperties;
      }
    | {
        menuType: "quantum";
      }
  >();
  const [customValues, setCustomValues] = useState<{ [id: string]: number }>({});
  const [customValueId, setCustomValueId] = useState<[string, number, number, number?][]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kbName, setKbName] = useState("");
  const [customEraseDialogOpen, setCustomEraseDialogOpen] = useState(false);
  const [quantumEraseDialogOpen, setQuantumEraseDialogOpen] = useState(false);
  const vialFileInputRef = useRef<HTMLInputElement>(null);
  const [quantumValues, setQuantumValues] = useState<{ [id: string]: number }>({});
  const [deviceList, setDeviceList] = useState<
    { name: string; index: number; connection: ConnectionType; opened: boolean }[]
  >([]);
  const [deviceIndex, setDeviceIndex] = useState<number | undefined>(undefined);
  const loadingTimerRef = useRef<number | null>(null);
  const [keymapLanguage, setKeymapLanguage] = useState("Chinese");
  const [uiLanguage, setUiLanguage] = useState<"zh" | "en">("zh");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number | null>(null);
  const [shortcutHelpAnchor, setShortcutHelpAnchor] = useState<HTMLElement | null>(null);
  const [shortcutHelp, setShortcutHelp] = useState<
    { name: string; label: string; shortcut: string }[]
  >([]);

  useEffect(() => {
    const updateShortcutHelp = (event: Event) => {
      setShortcutHelp((event as CustomEvent<{ name: string; label: string; shortcut: string }[]>).detail);
    };
    window.addEventListener("vial-shortcut-help", updateShortcutHelp);
    return () => window.removeEventListener("vial-shortcut-help", updateShortcutHelp);
  }, []);

  useEffect(() => {
    // load wasm
    init();
    (async () => {
      setDeviceList(await updateDeviceList());
    })();
    via.setOnLoading((isLoading: boolean) => {
      // Clear any existing timer regardless of new state
      if (loadingTimerRef.current !== null) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }

      // Set a new timer for either state change
      loadingTimerRef.current = window.setTimeout(
        () => {
          setLoading(isLoading);
          loadingTimerRef.current = null;
        },
        isLoading ? 100 : 300,
      ); // Use a slightly shorter delay for true to feel more responsive
    });

    const closeBluetoothOnPageHide = () => {
      void via.Close();
    };
    window.addEventListener("pagehide", closeBluetoothOnPageHide);

    return () => {
      window.removeEventListener("pagehide", closeBluetoothOnPageHide);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;

    let cancelled = false;

    const refreshDeviceStatus = async () => {
      if (isTauri) {
        try {
          const deviceName = deviceList.find((device) => device.index === deviceIndex)?.name ?? "";
          const level = await invoke<number | null>("battery_get_level", { deviceName });
          if (!cancelled && level !== null) setBatteryLevel(level);
        } catch (error) {
          console.warn("Could not read Bluetooth battery level", error);
        }
      }

      try {
        const layer = await via.GetCurrentLayer();
        if (!cancelled && layer !== null) setCurrentLayer(layer);
      } catch (error) {
        console.warn("Could not read current layer", error);
      }
    };

    void refreshDeviceStatus();
    const timer = window.setInterval(refreshDeviceStatus, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [connected, deviceIndex, deviceList]);

  const updateDeviceList = async () => {
    return (await via.GetDeviceList()).map((d) => {
      return {
        name: d.name,
        index: d.index,
        connection: d.connectionType,
        opened: d.opened,
      };
    });
  };

  const getCustomValues = async (_customValueId: typeof customValueId) => {
    const buffer = await via.GetCustomValue(_customValueId.map((v) => v.slice(1) as number[]));
    const customValues: { [id: string]: number } = buffer.reduce((acc, value, idx) => {
      return { ...acc, [_customValueId[idx][0]]: value };
    }, {});
    setCustomValues(customValues);
    console.log(customValues);
  };

  const openKeyboard = async (deviceIndex: number) => {
    const isBle = deviceIndex === -2;
    setLoading(true);
    setConnected(false);
    setVialJson(undefined);
    setCustomMenus([]);
    setActiveMenu(undefined);
    setCustomValues({});
    setKbName("");
    if (!isBle) {
      await via.Close();
    }
    try {
      await via.Open(
        deviceIndex ?? -1,
        () => {
          setLoading(true);
        },
        () => {
          setDeviceIndex(undefined);
          setVialJson(undefined);
          setCustomMenus([]);
          setActiveMenu(undefined);
          setCustomValues({});
          setConnected(false);
          setLoading(false);
          setKbName("");
          if (deviceIndex === -2) {
            window.location.reload();
          }
        },
      );
    } catch (e) {
      console.error("Failed to open the keyboard:", e);
      alert(`Failed to open the keyboard: ${e instanceof Error ? e.message : String(e)}`);
      await via.Close();
      setDeviceIndex(undefined);
      setLoading(false);
      if (isBle) {
        window.location.reload();
      }
      return;
    }

    const deviceList = await updateDeviceList();
    setDeviceList(deviceList);
    const newIdx = deviceList.find((d) => d.opened)?.index;
    setDeviceIndex(newIdx);

    try {
      const version = await via.GetProtocolVersion();
      await via.GetVialKeyboardId(); // enable vial mode of BMP
      console.log(`via protocol version:${version}`);
    } catch (e) {
      console.error(e);
      await via.Close();
      alert("Failed to open the keyboard");
      setLoading(false);
      if (isBle) {
        window.location.reload();
      }
      return;
    }

    let decompressed: Uint8Array;
    try {
      const compressed = await via.GetVialCompressedDefinition();
      decompressed = xz_decompress(compressed);
    } catch (e) {
      console.error(e);
      await via.Close();
      alert("Failed to open the keyboard");
      setLoading(false);
      if (isBle) {
        window.location.reload();
      }
      return;
    }

    const decoder = new TextDecoder();
    const jsonText = decoder.decode(decompressed);
    console.log(jsonText);
    const parsed = Hjson.parse(jsonText);
    console.log(parsed);
    setVialJson(parsed);
    setCustomMenus(parsed?.menus ?? []);
    setKbName(parsed?.name ?? via.GetHidName());
    setActiveMenu({ menuType: "quantum" });

    const dynamicEntryCount = await via.GetDynamicEntryCountAll();
    setDynamicEntryCount(dynamicEntryCount);

    const customValueId = ((parsed?.menus ?? []) as MenuItemProperties[]).flatMap((top) =>
      top.content.reduce((prev: [string, number, number, number?][], section) => {
        section.content.forEach((content) => {
          if ("type" in content) {
            prev.push(content.content);
          } else {
            if (Array.isArray(content.content)) {
              content.content.forEach((c) => prev.push(c.content));
            } else {
              prev.push(content.content);
            }
          }
        });
        return prev;
      }, []),
    );
    setCustomValueId(customValueId);
    await getCustomValues(customValueId);

    setConnected(true);
    setLoading(false);
  };

  const onVialSaveClick = async () => {
    if (vialJson === undefined) return;
    try {
      setLoading(true);
      downloadData(
        JSON.stringify(
          await VialKeyboardGetAllConfig(via, vialJson, dynamicEntryCount),
          (_key, value) => (typeof value === "bigint" ? value.toString() : value),
          4,
        ),
        `${kbName}-vial-setting.json`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onVialUploadJsonClick = async () => {
    vialFileInputRef.current?.click();
  };

  const onDfuClick = async () => {
    try {
      setLoading(true);
      await via.GoToBootloader();
    } finally {
      setLoading(false);
    }
  };

  const onVialJsonUploaded = async (json: string) => {
    try {
      if (vialJson === undefined) return;
      setLoading(true);
      const parsedJson = JSON.parse(json) as VialKeyboardConfig;
      try {
        await VialKeyboardSetAllConfig(via, parsedJson, vialJson, dynamicEntryCount, customValueId);
      } catch (e) {
        console.error(e);
        alert("Failed to write configurations");
      }

      await getCustomValues(customValueId);
      setVialJson({ ...vialJson! });
    } catch (error) {
      console.error("Error parsing JSON:", error);
      alert("Invalid JSON file.");
    } finally {
      setLoading(false);
    }
  };

  const onQuantumSaveClick = async () => {
    try {
      setLoading(true);
      await via.SetQuantumSettingsValue(
        Object.entries(quantumValues).reduce((acc, value) => {
          const idNum = QuantumSettingDefinition.map((def) => def.content)
            .map((def) => def.map((d) => d.content))
            .flat()
            .find((q) => q[0] === value[0])?.[1];
          return idNum !== undefined ? { ...acc, [idNum]: value[1] } : acc;
        }, {}),
      );
    } finally {
      setLoading(false);
    }
  };

  const onCustomSaveClick = async () => {
    try {
      setLoading(true);
      for (const element of customValueId) {
        await via.SetCustomValue(element.slice(1) as number[], customValues[element[0]]);
        await via.SaveCustomValue(element.slice(1) as number[]);
      }

      getCustomValues(customValueId);
    } finally {
      setLoading(false);
    }
  };

  const onCustomEraseClick = async () => {
    setCustomEraseDialogOpen(true);
  };

  const onDialogClose = () => {
    setCustomEraseDialogOpen(false);
  };

  const onDialogOkClick = async () => {
    setCustomEraseDialogOpen(false);
    try {
      setLoading(true);
      await via.ResetEeprom();
      await getCustomValues(customValueId);
    } finally {
      setLoading(false);
    }
  };

  const downloadData = (data: any, name: string) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([data]));
    link.setAttribute("href", url);
    link.setAttribute("download", name);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    handler: (json: string) => void,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        handler(e.target?.result as string);
      };
      reader.readAsText(file);
    }
    event.target.value = "";
  };

  return (
    <>
      <Dialog open={loading}>
        <DialogContent>Loading...</DialogContent>
      </Dialog>
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
            <Box sx={{ flex: "1 1 auto", minWidth: 0, maxWidth: 420 }}>
              <KeyboardSelector
                deviceIndex={deviceIndex}
                deviceList={deviceList}
                onChange={(idx) => {
                  setDeviceIndex(idx);
                  openKeyboard(idx);
                }}
                onOpen={async () => {
                  const deviceList = await updateDeviceList();
                  setDeviceList(deviceList);
                }}
              />
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
                  onClick={(event) => setShortcutHelpAnchor(event.currentTarget)}
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
                languageList={["US", "Japanese", "Chinese"]}
                lang={keymapLanguage}
                onChange={(selectedLanguage) => {
                  setKeymapLanguage(selectedLanguage);
                  setUiLanguage(selectedLanguage === "Chinese" ? "zh" : "en");
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
