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
      variant="standard"
      sx={{
        width: "100%",
        mb: 1,
        mt: 1,
        ".MuiInputBase-root": {
          backgroundColor: "#0f172a",
          border: "1px solid rgba(148, 163, 184, 0.35)",
          borderRadius: "10px",
          color: "#f8fafc",
          minHeight: "36px",
          padding: "0 8px",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        },
        ".MuiInput-root::before": {
          borderBottom: "1px solid rgba(148, 163, 184, 0.35)",
        },
        ".MuiInput-root::after": {
          height: "1px",
          borderBottom: "1px solid #475569",
        },
        ".MuiInputLabel-root": {
          color: "#cbd5e1",
        },
        ".MuiInputLabel-root.Mui-focused": {
          color: "#94a3b8",
        },
        ".MuiSelect-select": {
          color: "#f8fafc",
          backgroundColor: "transparent",
          minHeight: "unset",
          padding: "6px 32px 6px 2px",
        },
        ".MuiSvgIcon-root": {
          color: "#cbd5e1",
        },
      }}
    >
      {/* <InputLabel>Select Keyboard</InputLabel> */}
      <Select
        value={props.deviceIndex || ""}
        label="select-keyboard"
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
              backgroundColor: "#0f172a",
              color: "#f8fafc",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              boxShadow: "0 14px 28px rgba(15, 23, 42, 0.35)",
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
              color: "#c3d0e0",
              backgroundColor: "#0f172a",
              "&:hover": { backgroundColor: "#334155" },
            }}
          >
            <Typography noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
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
              color: "#c3d0e0",
              backgroundColor: "#0f172a",
              "&:hover": { backgroundColor: "#334155" },
            }}
          >
            Add New Keyboard
          </MenuItem>
        )}
        {isTauri || navigator.bluetooth === undefined ? (
          <></>
        ) : (
          <MenuItem
            key="new-device-ble"
            value={-2}
            sx={{
              display: isTauri ? "none" : "block",
              color: "#c3d0e0",
              backgroundColor: "#0f172a",
              "&:hover": { backgroundColor: "#334155" },
            }}
          >
            Connect by BLE
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
}
