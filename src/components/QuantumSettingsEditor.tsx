import { Box, Button, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { ViaKeyboard } from "../services/vialKeyboad";
import { MenuItemProperties, MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";
import quantumTranslations from "../locales/quantum.json";
import { KeycodeConverter } from "./keycodes/keycodeConverter";
import { MacroEditor } from "./MacroEditor";
import { KeymapEditor, KeymapProperties } from "./KeymapEditor";
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
  const [quantumValue, setQuantumValue] = useState<{ [id: string]: number }>({});
  const [selectedMacroIndex, setSelectedMacroIndex] = useState(0);
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();

  const tabs = [
    { label: "Keymap", content: [] } as { label: string; content: never[] },
    ...QuantumSettingDefinition,
    { label: "Macro", content: [] } as { label: string; content: never[] },
    ...(props.customMenus?.length
      ? [{ label: "Custom", content: [] } as { label: string; content: never[] }]
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

    const currentTab = tabs[tabValue] ?? QuantumSettingDefinition[0];
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

    navigator.locks.request("load-quantum-settings", async () => {
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
    });
  }, [props.via, tabValue]);

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
            key={menu.label}
            label={
              (quantumTranslations[props.language].tabs as Record<string, string>)[menu.label] ??
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
          {menu.label === "Keymap" && props.keymap && props.dynamicEntryCount ? (
            <KeymapEditor
              keymap={props.keymap}
              via={props.via}
              language={props.language}
              onLanguageChange={props.onLanguageChange}
              keymapLanguage={props.keymapLanguage}
              dynamicEntryCount={props.dynamicEntryCount}
            />
          ) : menu.label === "Macro" ? (
            <Box sx={{ p: 2 }}>
              {keycodeConverter && (props.macroCount ?? 0) > 0 ? (
                <>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                      gap: 1,
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
                          minHeight: 44,
                          color: selectedMacroIndex === index ? "#f8fafc" : "#cbd5e1",
                          borderColor: "rgba(148, 163, 184, 0.5)",
                          backgroundColor:
                            selectedMacroIndex === index ? "rgba(59, 130, 246, 0.32)" : "transparent",
                        }}
                      >
                        Macro {index}
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
          ) : menu.label === "Custom" ? (
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
                <Button variant="contained" onClick={props.onCustomSave}>
                  Save custom
                </Button>
                <Button variant="contained" color="error" onClick={props.onCustomErase}>
                  Erase custom
                </Button>
              </Box>
            </Box>
          ) : (
            <>
              <ViaMenuItem
                {...(menu as MenuSectionProperties)}
                customValues={quantumValue}
                onChange={(id, value) => {
                  console.log(`update ${id} to ${value}`);
                  const newValues = { ...quantumValue, [id[0]]: value };
                  setQuantumValue(newValues);
                  props.onChange(newValues);
                }}
              />
              <Box sx={{ display: "flex", gap: 1, p: 2 }}>
                <Button variant="contained" onClick={props.onSave}>
                  Save quantum
                </Button>
                <Button variant="contained" color="error" onClick={props.onErase}>
                  Erase quantum
                </Button>
              </Box>
            </>
          )}
        </Box>
      ))}
    </>
  );
}
