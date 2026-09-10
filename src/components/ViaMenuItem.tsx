import {
  Box,
  Button,
  Checkbox,
  FormControl,
  Grid,
  Input,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { MuiColorInput, MuiColorInputColors } from "mui-color-input";
import { ChangeEvent, SyntheticEvent } from "react";
import evaluate from "simple-evaluate";
import quantumTranslations from "../locales/quantum.json";

interface MenuItemProperties {
  label: string;
  content: MenuSectionProperties[];
}

type ToggleElement = {
  type: "toggle";
  label: string;
  options?: [number, number];
  content: [string, number, number, number?];
  value?: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type RangeElement = {
  type: "range";
  label: string;
  options?: [number, number];
  content: [string, number, number, number?];
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type DropdownElement = {
  type: "dropdown";
  label: string;
  content: [string, number, number, number?];
  options: Array<[string, number]> | Array<string>;
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type ColorElement = {
  type: "color";
  label: string;
  content: [string, number, number, number?];
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type ButtonElement = {
  type: "button";
  label: string;
  content: [string, number, number, number?];
  options?: Array<number>;
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type MultipleCheckboxElement = {
  type: "multiple-checkbox";
  label: string;
  content: [string, number, number, number?];
  options: Array<[string, number]> | Array<string>;
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type CheckboxListElement = {
  type: "checkbox-list";
  label: string;
  content: [string, number, number, number?];
  options: Array<[string, number]> | Array<string>;
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type NumberElement = {
  type: "number";
  label: string;
  options?: [number, number];
  content: [string, number, number, number?];
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type BitCheckboxElement = {
  type: "bit-checkbox";
  label: string;
  bit?: number;
  content: [string, number, number, number?];
  value: number;
  language?: "zh" | "en";
  onChange: (value: number) => void;
};

type ShowIfElement =
  | {
      showIf: string;
      content: MenuElementProperties[];
    }
  | (MenuElementProperties & { showIf: string });

type MenuElementProperties =
  | RangeElement
  | DropdownElement
  | ColorElement
  | ToggleElement
  | ButtonElement
  | MultipleCheckboxElement
  | CheckboxListElement
  | NumberElement
  | BitCheckboxElement;

type MenuSectionProperties = {
  label: string;
  content: (MenuElementProperties | ShowIfElement)[];
  customValues: { [id: string]: number };
  language?: "zh" | "en";
  onChange: (id: [string, number, number, number?], value: number) => void;
};

function translateLabel(label: string, lang: "zh" | "en" = "en"): string {
  if (lang !== "zh") return label;
  const qmkLabels = quantumTranslations.zh.qmkSettings.labels as Record<string, string>;
  return qmkLabels[label] ?? label;
}

function translateOption(option: string, lang: "zh" | "en" = "en"): string {
  if (lang !== "zh") return option;
  const qmkOptions = quantumTranslations.zh.qmkSettings.options as Record<string, string>;
  return qmkOptions[option] ?? option;
}

function ViaToggle(props: ToggleElement) {
  const handleChange = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    props.onChange(checked ? (props.options?.[1] ?? 1) : (props.options?.[0] ?? 0));
  };
  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={9}>
        <Switch onChange={handleChange} checked={props.value == (props.options?.[1] ?? 1)}></Switch>
      </Grid>
    </>
  );
}
function ViaRange(props: RangeElement) {
  const crop = (val: number) => {
    if (((props.options?.[1] ?? 255) < val && props.options?.[1]) ?? 0 < 0) {
      return val - 256;
    }

    return val;
  };
  const handleChange = (_event: Event, value: number | number[]) => {
    if (!Array.isArray(value)) {
      props.onChange(value);
    }
  };
  const handleChangeCommitted = (_event: SyntheticEvent | Event, value: number | number[]) => {
    if (!Array.isArray(value)) {
      props.onChange(value);
    }
  };
  const handleChangeInput = (event: ChangeEvent<HTMLInputElement>) => {
    const max = props.options?.[1] ?? 255;
    const min = props.options?.[0] ?? 0;
    const value = Math.min(
      max,
      Math.max(min, Number(event.target.value === "" ? 0 : event.target.value)),
    );
    props.onChange(value);
  };

  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={8}>
        <Slider
          value={crop(props.value)}
          onChange={handleChange}
          onChangeCommitted={handleChangeCommitted}
          min={props.options?.[0] ?? 0}
          max={props.options?.[1] ?? 255}
          valueLabelDisplay="auto"
        ></Slider>
      </Grid>
      <Grid item xs={1}>
        <Input
          value={crop(props.value)}
          onChange={handleChangeInput}
          inputProps={{ type: "number" }}
        ></Input>
      </Grid>
    </>
  );
}

function getDropDownLabels(
  elem: DropdownElement | MultipleCheckboxElement | CheckboxListElement,
): [string, number][] {
  return elem.options.map((o, index) => {
    if (Array.isArray(o)) {
      return [o[0], o[1]];
    } else {
      return [o, index];
    }
  });
}

function ViaDropDown(props: DropdownElement) {
  const labels = getDropDownLabels(props);

  const handleChange = (event: SelectChangeEvent) => {
    const selectedValue = String(event.target.value);
    props.onChange(labels.find((f) => f[0] === selectedValue)?.[1] ?? 0);
  };

  const selectedValue = labels.find((f) => f[1] === props.value)?.[0] ?? "";

  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={9}>
        <FormControl fullWidth>
          <Select value={String(selectedValue)} onChange={handleChange}>
            {labels.map((o) => {
              return (
                <MenuItem key={`${props.label}-${o[0]}`} value={String(o[0])}>
                  {translateOption(String(o[0]), props.language)}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Grid>
    </>
  );
}

function ViaColor(props: ColorElement) {
  const handleChange = (value: string, color: MuiColorInputColors) => {
    console.log(value);
    props.onChange(parseInt(color.hex.slice(1), 16));
  };
  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={9}>
        <FormControl fullWidth>
          <MuiColorInput
            value={{
              r: (props.value >> 16) & 0xff,
              g: (props.value >> 8) & 0xff,
              b: props.value & 0xff,
            }}
            onChange={handleChange}
            format="rgb"
          ></MuiColorInput>
        </FormControl>
      </Grid>
    </>
  );
}

function ViaButton(props: ButtonElement) {
  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={9}>
        <Button
          variant="outlined"
          onClick={() => {
            props.onChange(props.options?.[0] ?? 0);
          }}
        >
          {translateLabel(props.label, props.language)}
        </Button>
      </Grid>
    </>
  );
}

function ViaMultipleCheckbox(props: MultipleCheckboxElement) {
  const labels = getDropDownLabels(props);
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    props.onChange(
      typeof value === "string"
        ? (labels.find((v) => v[0] === value)?.[1] ?? 0)
        : (value as string[]).reduce(
            (p, c) => p ^ (1 << (labels.find((v) => v[0] === c)?.[1] ?? 0)),
            0,
          ),
    );
  };

  const valueToLabel = (value: string[]) => {
    return value
      .map((v) => {
        const raw = labels.find((label) => v === label[0])?.[0] ?? "";
        return translateOption(raw, props.language);
      })
      .join(", ");
  };

  const valueToArray = (value: number): string[] => {
    const bitsArray: number[] = [];
    for (let i = 0; i < 32; i++) {
      if (value & (1 << i)) {
        bitsArray.push(i);
      }
    }
    const arr = bitsArray.map((b) => labels.find((label) => label[1] == b)?.[0] ?? "");
    return arr;
  };

  return (
    <>
      <Grid item xs={3}>
        <h4>{translateLabel(props.label, props.language)}</h4>
      </Grid>
      <Grid item xs={9}>
        <FormControl fullWidth>
          <Select<string[]>
            className="quantum-multiple-select"
            multiple
            value={valueToArray(props.value)}
            onChange={handleChange}
            sx={{
              color: "#e5eefb",
              "& .quantum-select-value": {
                color: "#e5eefb",
                opacity: 1,
              },
            }}
            renderValue={() => (
              <span className="quantum-select-value">
                {valueToLabel(valueToArray(props.value)) || "None"}
              </span>
            )}
          >
            {labels.map((o) => {
              return (
                <MenuItem key={`${props.label}-${o[0]}`} value={o[0]}>
                  <Checkbox checked={(props.value & (1 << o[1])) !== 0} />
                  <ListItemText primary={translateOption(String(o[0]), props.language)} />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      </Grid>
    </>
  );
}

function ViaCheckboxList(props: CheckboxListElement) {
  const labels = getDropDownLabels(props);

  return (
    <Grid item xs={12}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
          maxWidth: 480,
          mx: "auto",
          mt: 0.5,
          mb: 1,
        }}
      >
        {labels.map(([optLabel, bit]) => {
          const isChecked = (props.value & (1 << bit)) !== 0;
          return (
            <Box
              key={`${props.label}-${optLabel}-${bit}`}
              onClick={() => props.onChange(props.value ^ (1 << bit))}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                cursor: "pointer",
                userSelect: "none",
                py: 0.1,
                px: 0.75,
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "rgba(51, 65, 85, 0.35)",
                },
              }}
            >
              <Typography
                sx={{
                  color: "#cbd5e1",
                  fontSize: "0.84rem",
                  fontWeight: 500,
                  flex: 1,
                  textAlign: "left",
                }}
              >
                {translateOption(String(optLabel), props.language)}
              </Typography>
              <Checkbox
                size="small"
                checked={isChecked}
                onChange={() => {}}
                sx={{
                  color: "#64748b",
                  "&.Mui-checked": { color: "#38bdf8" },
                  p: "2px",
                }}
              />
            </Box>
          );
        })}
      </Box>
    </Grid>
  );
}

function ViaNumber(props: NumberElement) {
  const min = props.options?.[0] ?? 0;
  const max = props.options?.[1] ?? 65535;

  return (
    <Grid item xs={12}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          maxWidth: 480,
          mx: "auto",
          py: 0.15,
          px: 0.75,
        }}
      >
        <Typography
          sx={{
            color: "#cbd5e1",
            fontSize: "0.84rem",
            fontWeight: 500,
            flex: 1,
            textAlign: "left",
          }}
        >
          {translateLabel(props.label, props.language)}
        </Typography>
        <TextField
          size="small"
          type="number"
          value={props.value ?? 0}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              props.onChange(Math.max(min, Math.min(max, val)));
            }
          }}
          inputProps={{
            min,
            max,
            style: {
              textAlign: "right",
              padding: "3px 6px",
              fontSize: "0.84rem",
              color: "#e2e8f0",
            },
          }}
          sx={{
            width: 78,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#1e2227",
              borderRadius: "4px",
              "& fieldset": { borderColor: "#484f5c" },
              "&:hover fieldset": { borderColor: "#64748b" },
              "&.Mui-focused fieldset": { borderColor: "#38bdf8" },
            },
          }}
        />
      </Box>
    </Grid>
  );
}

function ViaBitCheckbox(props: BitCheckboxElement) {
  const isChecked = (props.value & (1 << (props.bit ?? 0))) !== 0;

  return (
    <Grid item xs={12}>
      <Box
        onClick={() => props.onChange(props.value ^ (1 << (props.bit ?? 0)))}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          maxWidth: 480,
          mx: "auto",
          py: 0.1,
          px: 0.75,
          cursor: "pointer",
          userSelect: "none",
          borderRadius: 1,
          "&:hover": {
            backgroundColor: "rgba(51, 65, 85, 0.35)",
          },
        }}
      >
        <Typography
          sx={{
            color: "#cbd5e1",
            fontSize: "0.84rem",
            fontWeight: 500,
            flex: 1,
            textAlign: "left",
          }}
        >
          {translateLabel(props.label, props.language)}
        </Typography>
        <Checkbox
          size="small"
          checked={isChecked}
          onChange={() => {}}
          sx={{
            color: "#64748b",
            "&.Mui-checked": { color: "#38bdf8" },
            p: "2px",
          }}
        />
      </Box>
    </Grid>
  );
}

function MenuElement(props: MenuSectionProperties, elem: MenuElementProperties, key: string) {
  if ("type" in elem) {
    switch (elem.type) {
      case "toggle":
        return (
          <ViaToggle
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "range":
        return (
          <ViaRange
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "dropdown":
        return (
          <ViaDropDown
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "color":
        return (
          <ViaColor
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "button":
        return (
          <ViaButton
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "multiple-checkbox":
        return (
          <ViaMultipleCheckbox
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "checkbox-list":
        return (
          <ViaCheckboxList
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "number":
        return (
          <ViaNumber
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      case "bit-checkbox":
        return (
          <ViaBitCheckbox
            key={key}
            {...elem}
            language={props.language}
            value={props.customValues[elem.content[0]] ?? 0}
            onChange={(value) => props.onChange(elem.content, value)}
          />
        );
      default:
        return null;
    }
  }

  return null;
}

function ViaMenuItem(props: MenuSectionProperties) {
  const renderedContent = props.content.flatMap((elem, index) => {
    if ("showIf" in elem) {
      const show = evaluate(props.customValues, elem.showIf.replace(/({|})/g, ""));
      if (!show) {
        return [];
      }

      if ("label" in elem) {
        return [MenuElement(props, elem, `${props.label}-${index}-${elem.label}`)];
      }

      return elem.content.flatMap((nestedElem, nestedIndex) => {
        const nestedKey = `${props.label}-${index}-${nestedIndex}-${nestedElem.label}`;
        const rendered = MenuElement(props, nestedElem, nestedKey);
        return rendered ? [rendered] : [];
      });
    }

    if ("type" in elem) {
      return [MenuElement(props, elem, `${props.label}-${index}-${elem.label}`)];
    }

    return [];
  });

  return (
    <Grid container alignItems="center" spacing={2}>
      <Grid item xs={12}></Grid>
      {renderedContent}
    </Grid>
  );
}

export { ViaMenuItem };
export type { MenuItemProperties, MenuSectionProperties };
