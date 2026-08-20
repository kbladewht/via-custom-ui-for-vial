import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { ViaKeyboard } from "../services/vialKeyboad";
import { MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";

export function QuantumSettingsEditor(props: {
  via: ViaKeyboard;
  onChange: (value: { [id: string]: number }) => void;
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
    <Box
      sx={{
        backgroundColor: "#111827",
        border: "1px solid rgba(148, 163, 184, 0.22)",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      <Tabs
        value={tabValue}
        onChange={(_event, value) => setTabValue(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          backgroundColor: "#0f172a",
          borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
          minHeight: "48px",
          ".MuiTabs-indicator": {
            backgroundColor: "#60a5fa",
            height: 3,
          },
          ".MuiTab-root": {
            color: "#cbd5e1",
            fontWeight: 600,
            textTransform: "none",
            backgroundColor: "transparent",
            minHeight: "48px",
            borderRadius: "10px 10px 0 0",
            transition: "all 0.2s ease",
          },
          ".Mui-selected": {
            color: "#f8fafc !important",
            backgroundColor: "rgba(96, 165, 250, 0.12)",
          },
          ".MuiTab-root:hover": {
            backgroundColor: "rgba(148, 163, 184, 0.08)",
          },
        }}
      >
        {QuantumSettingDefinition.map((menu) => (
          <Tab key={menu.label} label={menu.label}></Tab>
        ))}
      </Tabs>

      {QuantumSettingDefinition.map((_menu, idx) => (
        <Box
          key={idx}
          hidden={tabValue !== idx}
          sx={{
            backgroundColor: "#111827",
            p: 2,
            borderTop: "1px solid rgba(148, 163, 184, 0.12)",
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
    </Box>
  );
}
