import { FormControl, MenuItem, Select, Typography } from "@mui/material";

const isTauri = import.meta.env.TAURI_ENV_PLATFORM !== undefined;

export function KeyboardSelector(props: {
  deviceIndex: number | undefined;
  deviceList: { name: string; index: number; connection: "usb" | "ble" }[];
  onChange: (idx: number) => void;
  onOpen: () => void;
}) {
  return (
    <FormControl
      variant="outlined"
      sx={{
        width: "fit-content",
        minWidth: "180px",
        maxWidth: "100%",
        mb: 1,
        mt: 1,
        ".MuiInputBase-root": {
          width: "fit-content",
          minWidth: "180px",
          maxWidth: "100%",
          height: "30px",
          borderRadius: "10px",
          backgroundColor: "var(--theme-surface-shell)",
          color: "var(--theme-text-strong)",
          fontSize: "13px",
          padding: "0 8px",
          boxSizing: "border-box",
        },
        ".MuiOutlinedInput-root": {
          borderRadius: "10px",
          "&:hover": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--theme-text-secondary)",
            },
          },
          "&.Mui-focused": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--theme-accent)",
              borderWidth: "1px",
            },
          },
        },
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "var(--theme-border)",
          borderWidth: "1px",
        },
        ".MuiInputLabel-root": {
          color: "var(--theme-text-secondary)",
        },
        ".MuiInputLabel-root.Mui-focused": {
          color: "var(--theme-text-muted)",
        },
        ".MuiSelect-select": {
          color: "var(--theme-text-strong)",
          backgroundColor: "transparent",
          minHeight: "unset",
          fontSize: "13px !important",
          lineHeight: "17px",
          paddingTop: "4px !important",
          paddingBottom: "4px !important",
        },
        ".MuiInputBase-input.MuiSelect-select": {
          fontSize: "13px !important",
        },
        ".MuiSvgIcon-root": {
          color: "var(--theme-text-secondary)",
        },
      }}
    >
      {/* <InputLabel>Select Keyboard</InputLabel> */}
      <Select
        variant="outlined"
        value={props.deviceIndex ?? ""}
        sx={{ fontSize: "13px !important" }}
        renderValue={(selected) => {
          const selectedDevice = props.deviceList.find(
            (device) => device.index === Number(selected),
          );
          return (
            <span style={{ fontSize: "13px", lineHeight: "17px" }}>
              {selectedDevice?.name ?? ""}
            </span>
          );
        }}
        onChange={(e) => {
          console.log(e.target.value);
          props.onChange(Number(e.target.value));
        }}
        onOpen={(_) => {
          props.onOpen();
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: "var(--theme-surface-deep)",
              color: "var(--theme-text-strong)",
              border: "1px solid var(--theme-border-35)",
              boxShadow: "0 14px 28px var(--theme-shadow)",
            },
          },
        }}
      >
        {props.deviceList.map((device) => (
          <MenuItem
            key={device.index}
            value={device.index}
            sx={{
              whiteSpace: "normal",
              wordBreak: "break-word",
              color: "var(--theme-text-action)",
              backgroundColor: "var(--theme-surface-deep)",
              fontSize: "13px",
              "&:hover": { backgroundColor: "var(--theme-surface-raised)" },
            }}
          >
            <Typography
              noWrap
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                width: "100%",
                fontSize: "13px",
                lineHeight: "17px",
              }}
            >
              {device.name}
            </Typography>
          </MenuItem>
        ))}
        {!isTauri && navigator.hid === undefined ? (
          <></>
        ) : (
          <MenuItem
            key="new-device"
            value={-1}
            sx={{
              display: isTauri ? "none" : "block",
              color: "var(--theme-text-action)",
              backgroundColor: "var(--theme-surface-deep)",
              fontSize: "13px",
              "&:hover": { backgroundColor: "var(--theme-surface-raised)" },
            }}
          >
            Add New Keyboard
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
}
