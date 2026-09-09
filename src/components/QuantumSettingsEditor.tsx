import { Box, Button, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { ViaKeyboard } from "../services/vialKeyboad";
import { MenuItemProperties, MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";
import quantumTranslations from "../locales/quantum.json";
import { KeycodeConverter } from "./keycodes/keycodeConverter";
import { MacroEditor } from "./MacroEditor";
import { LightingEditor } from "./LightingEditor";
import { ComboOverrideEditor, KeymapEditor, KeymapProperties, TapDanceSelector } from "./KeymapEditor";
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
  const [selectedMacroIndex, setSelectedMacroIndex] = useState(0);
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();

  const tabs = [
    { id: "Keymap", label: "Keymap" },
    { id: "Macro", label: "Macro" },
    { id: "Lighting", label: "Lighting" },
    { id: "TapDance", label: "TapDance" },
    { id: "Combos", label: "Combos" },
    { id: "Quantum", label: "QMK Settings" },
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
    const undefinedIds = currentTab.content
      .filter((v) => quantumValue[v.content[0]] === undefined)
      .map((v) => v.content[1] as number);
    const newValue = { ...quantumValue };
    undefinedIds.forEach((id) => {
      newValue[id] = 0;
    });
    props.onChange(newValue);
    setQuantumValue(newValue);

    if (undefinedIds.length === 0) return;

    const loadQuantumSettings = async () => {
      const value = await props.via.GetQuantumSettingsValue(undefinedIds);
      const newValue = Object.entries(value).reduce(
        (acc, v) => {
          const id = currentTab.content.find((c) => {
            return c.content[1].toString() === v[0];
          });
          return {
            ...acc,
            [id?.content[0] ?? "id-unknown"]:
              v[1] & ((1 << (8 * ((id?.content[2] as number) ?? 2))) - 1),
          };
        },
        { ...quantumValue },
      );
      setQuantumValue(newValue);
      console.log(newValue);
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
              menu.id === "Quantum"
                ? "QMK Settings"
                : (quantumTranslations[props.language].tabs as Record<string, string>)[menu.id] ??
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
                  onChange={(id, value) => {
                    console.log(`update ${id} to ${value}`);
                    const newValues = { ...quantumValue, [id[0]]: value };
                    setQuantumValue(newValues);
                    props.onChange(newValues);
                  }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                  <Button className="quantum-setting-save" variant="contained" onClick={props.onSave}>
                    Save
                  </Button>
                  <Button className="quantum-setting-erase" variant="contained" color="error" onClick={props.onErase}>
                    Erase
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
            <LightingEditor via={props.via} lighting={props.keymap?.lighting} />
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
