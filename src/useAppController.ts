import { invoke } from "@tauri-apps/api/core";
import * as Hjson from "hjson";
import { useEffect, useRef, useState } from "react";
import { KeymapProperties } from "./components/KeymapEditor";
import { MenuItemProperties, MenuSectionProperties } from "./components/ViaMenuItem";
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
import { discardPendingKeycapAudio, prepareKeycapAudio } from "./components/KeymapEditor";

export const isTauri = import.meta.env.TAURI_ENV_PLATFORM !== undefined;

if (!isTauri && !navigator.hid && !navigator.bluetooth) {
  alert("Please use browser with WebHID or WebBluetooth support");
}

export const via = new ViaKeyboard(
  isTauri || navigator.hid !== undefined,
  navigator.bluetooth !== undefined,
);

export function useAppController() {
  const [vialJson, setVialJson] = useState<VialDefinition | undefined>();
  const [dynamicEntryCount, setDynamicEntryCount] = useState<DynamicEntryCount>({
    layer: 0,
    macro: 0,
    tapdance: 0,
    combo: 0,
    override: 0,
  });
  const [customMenus, setCustomMenus] = useState<MenuItemProperties[]>([]);
  const [activeMenu, setActiveMenu] = useState<
    | { menuType: "customMenu"; menu: MenuSectionProperties }
    | { menuType: "keymap"; menu: KeymapProperties }
    | { menuType: "quantum" }
    | undefined
  >();
  const [customValues, setCustomValues] = useState<{ [id: string]: number }>({});
  const [customValueId, setCustomValueId] = useState<[string, number, number, number?][]>([]);
  const [connected, setConnected] = useState(false);
  const [loadedDeviceIndex, setLoadedDeviceIndex] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [kbName, setKbName] = useState("");
  const [quantumEraseDialogOpen, setQuantumEraseDialogOpen] = useState(false);
  const [customEraseDialogOpen, setCustomEraseDialogOpen] = useState(false);
  const [quantumValues, setQuantumValues] = useState<{ [id: string]: number }>({});
  const [deviceList, setDeviceList] = useState<
    { name: string; index: number; connection: ConnectionType; opened: boolean }[]
  >([]);
  const [deviceIndex, setDeviceIndex] = useState<number>();
  const [keymapLanguage, setKeymapLanguage] = useState("US");
  const [uiLanguage, setUiLanguage] = useState<"zh" | "en">("en");
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number | null>(null);
  const [shortcutHelpAnchor, setShortcutHelpAnchor] = useState<HTMLElement | null>(null);
  const [shortcutHelp, setShortcutHelp] = useState<
    { name: string; label: string; shortcut: string }[]
  >([]);
  const vialFileInputRef = useRef<HTMLInputElement>(null);
  const loadingTimerRef = useRef<number | null>(null);
  const keyboardLoadedRef = useRef(false);

  const updateDeviceList = async () =>
    (await via.GetDeviceList()).map((device) => ({
      name: device.name,
      index: device.index,
      connection: device.connectionType,
      opened: device.opened,
    }));

  const getCustomValues = async (ids: typeof customValueId) => {
    const buffer = await via.GetCustomValue(ids.map((value) => value.slice(1) as number[]));
    const values = buffer.reduce<{ [id: string]: number }>((result, value, index) => {
      result[ids[index][0]] = value;
      return result;
    }, {});
    setCustomValues(values);
  };

  const openKeyboard = async (index: number) => {
    const isBle = index === -2;
    keyboardLoadedRef.current = false;
    setLoading(true);
    setConnected(false);
    setLoadedDeviceIndex(undefined);
    setVialJson(undefined);
    setCustomMenus([]);
    setActiveMenu(undefined);
    setCustomValues({});
    setKbName("");
    if (!isBle) await via.Close();

    try {
      await via.Open(
        index,
        () => setLoading(true),
        () => {
          setDeviceIndex(undefined);
          setVialJson(undefined);
          setCustomMenus([]);
          setActiveMenu(undefined);
          setCustomValues({});
          setConnected(false);
          setLoadedDeviceIndex(undefined);
          setLoading(false);
          setKbName("");
          if (index === -2) window.location.reload();
        },
      );
    } catch (error) {
      console.error("Failed to open the keyboard:", error);
      alert(`Failed to open the keyboard: ${error instanceof Error ? error.message : String(error)}`);
      await via.Close();
      setDeviceIndex(undefined);
      setLoading(false);
      if (isBle) window.location.reload();
      return;
    }

    const devices = await updateDeviceList();
    setDeviceList(devices);
    setDeviceIndex(devices.find((device) => device.opened)?.index);

    try {
      const version = await via.GetProtocolVersion();
      await via.GetVialKeyboardId();
      console.log(`via protocol version:${version}`);
    } catch (error) {
      console.error(error);
      await via.Close();
      alert("Failed to open the keyboard");
      setLoading(false);
      if (isBle) window.location.reload();
      return;
    }

    let definition: Uint8Array;
    try {
      definition = xz_decompress(await via.GetVialCompressedDefinition());
    } catch (error) {
      console.error(error);
      await via.Close();
      alert("Failed to open the keyboard");
      setLoading(false);
      if (isBle) window.location.reload();
      return;
    }

    const parsed = Hjson.parse(new TextDecoder().decode(definition)) as VialDefinition;
    setVialJson(parsed);
    setCustomMenus((parsed?.menus ?? []) as MenuItemProperties[]);
    setKbName(parsed?.name ?? via.GetHidName());
    setActiveMenu({ menuType: "quantum" });
    setDynamicEntryCount(await via.GetDynamicEntryCountAll());

    const ids = ((parsed?.menus ?? []) as MenuItemProperties[]).flatMap((top) =>
      top.content.reduce<[string, number, number, number?][]>((result, section) => {
        section.content.forEach((content) => {
          if ("type" in content) {
            result.push(content.content);
          } else if (Array.isArray(content.content)) {
            content.content.forEach((item) => result.push(item.content));
          } else {
            result.push(content.content);
          }
        });
        return result;
      }, []),
    );
    setCustomValueId(ids);
    await getCustomValues(ids);
    keyboardLoadedRef.current = true;
    setConnected(true);
    setLoadedDeviceIndex(index);
    setLoading(false);
  };

  useEffect(() => {
    const updateShortcutHelp = (event: Event) => {
      setShortcutHelp((event as CustomEvent<{ name: string; label: string; shortcut: string }[]>).detail);
    };
    window.addEventListener("vial-shortcut-help", updateShortcutHelp);
    return () => window.removeEventListener("vial-shortcut-help", updateShortcutHelp);
  }, []);

  useEffect(() => {
    void init();
    void updateDeviceList().then((devices) => {
      setDeviceList(devices);
      if (devices[0]) {
        setDeviceIndex(devices[0].index);
        prepareKeycapAudio();
        void openKeyboard(devices[0].index);
      }
    });
    via.setOnLoading((isLoading: boolean) => {
      if (keyboardLoadedRef.current) return;
      if (loadingTimerRef.current !== null) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = window.setTimeout(() => {
        setLoading(isLoading);
        loadingTimerRef.current = null;
      }, isLoading ? 100 : 300);
    });
    const closeBluetoothOnPageHide = () => void via.Close();
    const unlockKeycapAudio = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof PointerEvent && event.target instanceof Element && event.target.closest("[data-keymap-load]")) {
        discardPendingKeycapAudio();
      }
      prepareKeycapAudio(true);
    };
    window.addEventListener("pagehide", closeBluetoothOnPageHide);
    window.addEventListener("pointerdown", unlockKeycapAudio, { once: true, capture: true });
    window.addEventListener("keydown", unlockKeycapAudio, { once: true, capture: true });
    return () => {
      window.removeEventListener("pagehide", closeBluetoothOnPageHide);
      window.removeEventListener("pointerdown", unlockKeycapAudio, true);
      window.removeEventListener("keydown", unlockKeycapAudio, true);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    const refreshDeviceStatus = async () => {
      let level: number | null = null;
      try {
        level = await via.GetBatteryLevel();
      } catch (error) {
        console.warn("Could not read keyboard battery level", error);
      }
      if (level === null && isTauri) {
        try {
          const name = deviceList.find((device) => device.index === deviceIndex)?.name ?? "";
          level = await invoke<number | null>("battery_get_level", { deviceName: name });
        } catch (error) {
          console.warn("Could not read Tauri battery level", error);
        }
      }
      if (!cancelled && level !== null) setBatteryLevel(level);
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

  const downloadData = (data: string, name: string) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([data]));
    link.href = url;
    link.download = name;
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const onVialSaveClick = async () => {
    if (!vialJson) return;
    try {
      setLoading(true);
      downloadData(
        JSON.stringify(await VialKeyboardGetAllConfig(via, vialJson, dynamicEntryCount), (_key, value) => typeof value === "bigint" ? value.toString() : value, 4),
        `${kbName}-vial-setting.json`,
      );
    } finally {
      setLoading(false);
    }
  };

  const onVialUploadJsonClick = () => vialFileInputRef.current?.click();
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
      if (!vialJson) return;
      setLoading(true);
      try {
        await VialKeyboardSetAllConfig(via, JSON.parse(json) as VialKeyboardConfig, vialJson, dynamicEntryCount, customValueId);
      } catch (error) {
        console.error(error);
        alert("Failed to write configurations");
      }
      await getCustomValues(customValueId);
      setVialJson({ ...vialJson });
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
      await via.SetQuantumSettingsValue(Object.entries(quantumValues).reduce((result, value) => {
        const id = QuantumSettingDefinition.map((definition) => definition.content)
          .map((definition) => definition.map((item) => item.content))
          .flat()
          .find((setting) => setting[0] === value[0])?.[1];
        return id !== undefined ? { ...result, [id]: value[1] } : result;
      }, {}));
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
      await getCustomValues(customValueId);
    } finally {
      setLoading(false);
    }
  };
  const onCustomEraseClick = () => setCustomEraseDialogOpen(true);
  const onDialogClose = () => setCustomEraseDialogOpen(false);
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
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, handler: (json: string) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => handler(loadEvent.target?.result as string);
      reader.readAsText(file);
    }
    event.target.value = "";
  };

  return {
    vialJson,
    dynamicEntryCount,
    customMenus,
    activeMenu,
    customValues,
    setCustomValues,
    setLoading,
    customValueId,
    connected,
    loadedDeviceIndex,
    loading,
    kbName,
    customEraseDialogOpen,
    setCustomEraseDialogOpen,
    quantumEraseDialogOpen,
    setQuantumEraseDialogOpen,
    vialFileInputRef,
    quantumValues,
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
  };
}
