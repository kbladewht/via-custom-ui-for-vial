import { Box, Button, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { ViaKeyboard } from "../services/vialKeyboad";
import { MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";
import quantumTranslations from "../locales/quantum.json";

export function QuantumSettingsEditor(props: {
  via: ViaKeyboard;
  onChange: (value: { [id: string]: number }) => void;
  language: "zh" | "en";
  onLanguageChange: (language: "zh" | "en") => void;
}) {
  const [tabValue, setTabValue] = useState(0);
  const [quantumValue, setQuantumValue] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    console.log("read quantum values");

    const undefinedIds = QuantumSettingDefinition[tabValue].content
      .filter((v) => quantumValue[v.content[0]] === undefined)
      .map((v) => v.content[1] as number);
    const newValue = { ...quantumValue };
    undefinedIds.forEach((id) => {
      newValue[id] = 0;
    });
    props.onChange(newValue);
    setQuantumValue(newValue);

    navigator.locks.request("load-quantum-settings", async () => {
      const value = await props.via.GetQuantumSettingsValue(undefinedIds);
      const newValue = Object.entries(value).reduce(
        (acc, v) => {
          const id = QuantumSettingDefinition[tabValue].content.find((c) => {
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
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => props.onLanguageChange(props.language === "zh" ? "en" : "zh")}
          sx={{
            color: "#c3d0e0",
            borderColor: "#475569",
            backgroundColor: "#1e293b",
            "&:hover": {
              borderColor: "#64748b",
              backgroundColor: "#334155",
            },
          }}
        >
          {quantumTranslations[props.language].switchLabel}
        </Button>
      </Box>
      <Tabs
        value={tabValue}
        onChange={(_event, value) => setTabValue(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {QuantumSettingDefinition.map((menu) => (
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

      {QuantumSettingDefinition.map((_menu, idx) => (
        <Box
          key={idx}
          sx={{
            display: tabValue === idx ? "block" : "none",
          }}
        >
          <ViaMenuItem
            {...(QuantumSettingDefinition[idx] as MenuSectionProperties)}
            customValues={quantumValue}
            onChange={(id, value) => {
              console.log(`update ${id} to ${value}`);
              const newValues = { ...quantumValue, [id[0]]: value };
              setQuantumValue(newValues);
              props.onChange(newValues);
            }}
          />
        </Box>
      ))}
    </>
  );
}
