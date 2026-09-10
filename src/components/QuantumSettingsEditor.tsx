import { Box, Button, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { ViaKeyboard } from "../services/vialKeyboad";
import { MenuItemProperties, MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";
import quantumTranslations from "../locales/quantum.json";
import { KeycodeConverter } from "./keycodes/keycodeConverter";
import { MacroEditor } from "./MacroEditor";
import { LightingEditor } from "./LightingEditor";
import { AltRepeatKeySelector, ComboOverrideEditor, KeymapEditor, KeymapProperties, KeyOverrideSelector, TapDanceSelector } from "./KeymapEditor";
import { MatrixTester } from "./MatrixTester";
import { DynamicEntryCount } from "../services/vialKeyboad";

export function QuantumSettingsEditor(props: {
  via: ViaKeyboard;
  onChange: (value: { [id: string]: number }) => void;
  language: "zh" | "en";
  onLanguageChange: (language: "zh" | "en") => void;
  macroCount?: number;
  customKeycodes?: { name: string; title: string; shortName: string }[];
  keymap?: KeymapProperties;
  dynamicEntryCount?: DynamicEntryCount;
  keymapLanguage: string;
  onSave?: () => void;
  onErase?: () => void;
  customMenus?: MenuItemProperties[];
  onCustomSave?: () => void;
  onCustomErase?: () => void;
}) {
  const [tabValue, setTabValue] = useState(0);
  const [quantumTabValue, setQuantumTabValue] = useState(0);
  const [quantumValue, setQuantumValue] = useState<{ [id: string]: number }>({});
  const [savedQuantumValue, setSavedQuantumValue] = useState<{ [id: string]: number }>({});
  const [selectedMacroIndex, setSelectedMacroIndex] = useState(0);
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();

  const t = quantumTranslations[props.language ?? "en"];

  const isDirty = Object.keys(quantumValue).some(
    (key) => savedQuantumValue[key] !== undefined && quantumValue[key] !== savedQuantumValue[key]
  );

  const tabs = [
    { id: "Keymap", label: "Keymap" },
    { id: "Macro", label: "Macro" },
    { id: "Lighting", label: "Lighting" },
    { id: "TapDance", label: "TapDance" },
    { id: "Combos", label: "Combos" },
    { id: "KeyOverride", label: "Key Overrides" },
    { id: "AltRepeatKey", label: "Alt Repeat Key" },
    { id: "Quantum", label: "QMK Settings" },
    { id: "MatrixTester", label: "Matrix tester" },
    ...(props.customMenus?.length
      ? [{ id: "Custom", label: "Custom" }]
      : []),
  ];

  useEffect(() => {
    if (props.macroCount === undefined) return;

    KeycodeConverter.Create(
      0,
      props.customKeycodes,
      props.macroCount,
      0,
      "Chinese",
      "0.0.3",
      props.language,
    ).then((k) => setKeycodeConverter(k));
  }, [props.customKeycodes, props.language, props.macroCount]);

  useEffect(() => {
    console.log("read quantum values");

    const currentTab = QuantumSettingDefinition[quantumTabValue] ?? QuantumSettingDefinition[0];
    const uniqueIds = Array.from(new Set(currentTab.content.map((v) => v.content[1] as number)));
    const undefinedIds = uniqueIds.filter((id) => {
      const entry = currentTab.content.find((v) => v.content[1] === id);
      return entry && quantumValue[entry.content[0]] === undefined;
    });
    const newValue = { ...quantumValue };
    const newSaved = { ...savedQuantumValue };
    undefinedIds.forEach((id) => {
      const entry = currentTab.content.find((v) => v.content[1] === id);
      if (entry) {
        newValue[entry.content[0]] = 0;
        if (newSaved[entry.content[0]] === undefined) {
          newSaved[entry.content[0]] = 0;
        }
      }
    });
    props.onChange(newValue);
    setQuantumValue(newValue);
    setSavedQuantumValue(newSaved);

    if (undefinedIds.length === 0) return;

    const loadQuantumSettings = async () => {
      const value = await props.via.GetQuantumSettingsValue(undefinedIds);
      const loadedUpdates: { [id: string]: number } = {};
      Object.entries(value).forEach((v) => {
        const id = currentTab.content.find((c) => {
          return c.content[1].toString() === v[0];
        });
        if (id) {
          const width = (id.content[2] as number) ?? 2;
          const mask = width === 4 ? 0xffffffff : (1 << (8 * width)) - 1;
          loadedUpdates[id.content[0]] = (v[1] & mask) >>> 0;
        }
      });
      setQuantumValue((prev) => ({ ...prev, ...loadedUpdates }));
      setSavedQuantumValue((prev) => ({ ...prev, ...loadedUpdates }));
      props.onChange({ ...newValue, ...loadedUpdates });
      console.log(loadedUpdates);
    };

    if (navigator.locks?.request) {
      void navigator.locks.request("load-quantum-settings", loadQuantumSettings);
    } else {
      void loadQuantumSettings();
    }
  }, [props.via, quantumTabValue]);

  return (
    <>
      <Tabs
        value={tabValue}
        onChange={(_event, value) => setTabValue(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          py: 0,
        }}
      >
        {tabs.map((menu) => (
          <Tab
            key={menu.id}
            label={
              (quantumTranslations[props.language].tabs as Record<string, string>)[menu.id] ??
              menu.label
            }
            sx={{
              color: "#b8c7dc",
              fontWeight: 600,
              textTransform: "none",
              border: "1px solid #334155",
              borderRadius: "8px 8px 0 0",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              "&.Mui-selected": {
                color: "#f8fafc",
                borderColor: "#475569",
                backgroundColor: "#334155",
              },
            }}
          />
        ))}
      </Tabs>

      {tabs.map((menu, idx) => (
        <Box
          key={idx}
          sx={{
            display: tabValue === idx ? "block" : "none",
          }}
        >
          {menu.id === "Keymap" && props.keymap && props.dynamicEntryCount ? (
            <KeymapEditor
              keymap={props.keymap}
              via={props.via}
              language={props.language}
              onLanguageChange={props.onLanguageChange}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.id === "Combos" && props.dynamicEntryCount ? (
            <ComboOverrideEditor
              via={props.via}
              language={props.language}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.id === "TapDance" && props.dynamicEntryCount ? (
            <TapDanceSelector
              via={props.via}
              language={props.language}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.id === "KeyOverride" && props.dynamicEntryCount ? (
            <KeyOverrideSelector
              via={props.via}
              language={props.language}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.id === "AltRepeatKey" && props.dynamicEntryCount ? (
            <AltRepeatKeySelector
              via={props.via}
              language={props.language}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.id === "Quantum" ? (
            <Box>
              <Tabs
                value={quantumTabValue}
                onChange={(_event, value) => setQuantumTabValue(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ py: 0 }}
              >
                {QuantumSettingDefinition.map((quantumTab) => (
                  <Tab
                    key={quantumTab.label}
                    label={
                      (quantumTranslations[props.language].tabs as Record<string, string>)[quantumTab.label] ??
                      quantumTab.label
                    }
                    sx={{
                      color: "#b8c7dc",
                      fontWeight: 600,
                      textTransform: "none",
                      border: "1px solid #334155",
                      borderRadius: "8px 8px 0 0",
                      backgroundColor: "rgba(30, 41, 59, 0.7)",
                      "&.Mui-selected": {
                        color: "#f8fafc",
                        borderColor: "#475569",
                        backgroundColor: "#334155",
                      },
                    }}
                  />
                ))}
              </Tabs>
              <Box sx={{ p: 2 }}>
                <ViaMenuItem
                  {...(QuantumSettingDefinition[quantumTabValue] as MenuSectionProperties)}
                  customValues={quantumValue}
                  language={props.language}
                  onChange={(id, value) => {
                    console.log(`update ${id} to ${value}`);
                    const newValues = { ...quantumValue, [id[0]]: value };
                    setQuantumValue(newValues);
                    props.onChange(newValues);
                  }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <Button
                    variant="outlined"
                    disabled={!isDirty}
                    onClick={async () => {
                      await props.onSave?.();
                      setSavedQuantumValue({ ...quantumValue });
                    }}
                    sx={{
                      minWidth: 68,
                      px: 2,
                      py: 0.4,
                      fontSize: "0.85rem",
                      textTransform: "none",
                      borderRadius: "4px",
                      border: "1px solid #475569",
                      color: isDirty ? "#f8fafc" : "#64748b",
                      backgroundColor: isDirty ? "#243042" : "rgba(30, 41, 59, 0.4)",
                      "&:hover": {
                        borderColor: isDirty ? "#64748b" : "#475569",
                        backgroundColor: isDirty ? "#334155" : "rgba(30, 41, 59, 0.4)",
                      },
                      "&.Mui-disabled": {
                        color: "#64748b",
                        borderColor: "#334155",
                        backgroundColor: "rgba(30, 41, 59, 0.3)",
                      },
                    }}
                  >
                    {t.common.save}
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={!isDirty}
                    onClick={() => {
                      setQuantumValue({ ...savedQuantumValue });
                      props.onChange({ ...savedQuantumValue });
                    }}
                    sx={{
                      minWidth: 68,
                      px: 2,
                      py: 0.4,
                      fontSize: "0.85rem",
                      textTransform: "none",
                      borderRadius: "4px",
                      border: "1px solid #475569",
                      color: isDirty ? "#f8fafc" : "#64748b",
                      backgroundColor: isDirty ? "#243042" : "rgba(30, 41, 59, 0.4)",
                      "&:hover": {
                        borderColor: isDirty ? "#64748b" : "#475569",
                        backgroundColor: isDirty ? "#334155" : "rgba(30, 41, 59, 0.4)",
                      },
                      "&.Mui-disabled": {
                        color: "#64748b",
                        borderColor: "#334155",
                        backgroundColor: "rgba(30, 41, 59, 0.3)",
                      },
                    }}
                  >
                    {t.common.undo}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={props.onErase}
                    sx={{
                      minWidth: 68,
                      px: 2,
                      py: 0.4,
                      fontSize: "0.85rem",
                      textTransform: "none",
                      borderRadius: "4px",
                      border: "1px solid #475569",
                      color: "#f8fafc",
                      backgroundColor: "#243042",
                      "&:hover": {
                        borderColor: "#64748b",
                        backgroundColor: "#334155",
                      },
                    }}
                  >
                    {t.common.reset}
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : menu.id === "Macro" ? (
            <Box sx={{ p: 2 }}>
              {keycodeConverter && (props.macroCount ?? 0) > 0 ? (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, 50px)",
                      justifyContent: "start",
                      gap: 0.5,
                      mb: 2,
                    }}
                  >
                    {Array.from({ length: props.macroCount ?? 0 }, (_, index) => (
                      <Button
                        key={index}
                        variant={selectedMacroIndex === index ? "contained" : "outlined"}
                        color={selectedMacroIndex === index ? "primary" : "inherit"}
                        onClick={() => setSelectedMacroIndex(index)}
                        sx={{
                          width: 50,
                          minWidth: 50,
                          minHeight: 44,
                          px: 0,
                          color: selectedMacroIndex === index ? "#f8fafc" : "#cbd5e1",
                          borderColor: "rgba(148, 163, 184, 0.5)",
                          backgroundColor:
                            selectedMacroIndex === index ? "rgba(59, 130, 246, 0.32)" : "transparent",
                        }}
                      >
                        M{index}
                      </Button>
                    ))}
                  </Box>
                  <MacroEditor
                    via={props.via}
                    keycodeConverter={keycodeConverter}
                    macroIndex={selectedMacroIndex}
                    macroCount={props.macroCount ?? 0}
                    onBack={() => {}}
                  />
                </>
              ) : (
                <Box sx={{ color: "#cbd5e1" }}>No macros available.</Box>
              )}
            </Box>
          ) : menu.id === "Lighting" ? (
            <LightingEditor via={props.via} lighting={props.keymap?.lighting} language={props.language} />
          ) : menu.id === "MatrixTester" && props.keymap ? (
            tabValue === idx ? (
              <MatrixTester
                keymap={props.keymap}
                via={props.via}
                language={props.language}
                keymapLanguage={props.keymapLanguage}
                dynamicEntryCount={props.dynamicEntryCount}
                isActive={true}
              />
            ) : null
          ) : menu.id === "Custom" ? (
            <Box sx={{ p: 2 }}>
              {props.customMenus?.map((customMenu) => (
                <Box key={customMenu.label} sx={{ mb: 2 }}>
                  {customMenu.content.map((section) => (
                    <ViaMenuItem
                      key={section.label}
                      {...section}
                      customValues={quantumValue}
                      onChange={async (id, value) => {
                        setQuantumValue({ ...quantumValue, [id[0]]: value });
                        await props.via.SetCustomValue(id.slice(1) as number[], value);
                      }}
                    />
                  ))}
                </Box>
              ))}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button className="quantum-setting-save" variant="contained" onClick={props.onCustomSave}>
                  Save
                </Button>
                <Button className="quantum-setting-erase" variant="contained" color="error" onClick={props.onCustomErase}>
                  Erase
                </Button>
              </Box>
            </Box>
          ) : null}
        </Box>
      ))}
    </>
  );
}
