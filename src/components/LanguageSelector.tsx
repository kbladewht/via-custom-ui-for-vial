import { FormControl, MenuItem, Select } from "@mui/material";

/** Display names of the selectable keymap languages (the value stays the technical language code). */
const LANGUAGE_LABELS: { [language: string]: string } = {
  US: "US",
  zh: "中文",
};

export function LanguageSelector(props: {
  languageList: string[];
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <FormControl variant="standard">
      <Select
        value={props.lang}
        label="language"
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.languageList.map((label) => (
          <MenuItem key={label} value={label}>
            {LANGUAGE_LABELS[label] ?? label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
