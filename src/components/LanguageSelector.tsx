import { FormControl, MenuItem, Select } from "@mui/material";
import quantumTranslations from "../locales/quantum.json";

export function LanguageSelector(props: {
  languageList: string[];
  lang: string;
  language?: "zh" | "en";
  onChange: (lang: string) => void;
}) {
  const languageNames: { [language: string]: string } =
    quantumTranslations[props.language ?? "en"].languageNames;
  return (
    <FormControl variant="standard">
      <Select
        value={props.lang}
        label="language"
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.languageList.map((label) => (
          <MenuItem key={label} value={label}>
            {languageNames[label] ?? label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
