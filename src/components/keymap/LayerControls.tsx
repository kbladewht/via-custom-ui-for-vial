import { Box, Button, MenuItem, Select } from "@mui/material";

export function LayoutSelector(props: {
  layouts: {
    labels?: string[][];
    keymap: (string | object)[][];
  };
  option: { [layout: number]: number };
  onChange: (option: { [layout: number]: number }) => void;
}) {
  const labels = props.layouts.labels?.[0]?.slice(1) ?? [];
  const layoutCount = props.layouts.keymap
    .flatMap((row) => row)
    .reduce((count, key) => {
      if (typeof key !== "string") return count;
      const layout = Number(key.split("\n")[3]?.split(",")[1]);
      return Number.isInteger(layout) ? Math.max(count, layout + 1) : count;
    }, 1);
  const options = labels.length > 0
    ? labels
    : layoutCount === 2
      ? ["P40", "HHKB"]
      : [...Array(layoutCount)].map((_, index) => `Layout ${index}`);

  if (options.length < 2) {
    return null;
  }

  return (
    <Select
      variant="standard"
      value={props.option[0] ?? 0}
      label="layout"
      sx={{ width: "max-content", minWidth: 0, mt: 1, mb: 1, fontSize: "10px" }}
      onChange={(event) => {
        props.onChange({ 0: Number(event.target.value) });
      }}
    >
      {options.map((label, index) => (
        <MenuItem key={label} value={index} sx={{ fontSize: "10px" }}>
          {label}
        </MenuItem>
      ))}
    </Select>
  );
}

export function LayerSelector(props: {
  layerCount: number;
  currentLayer?: number;
  onChange: (layer: number) => void;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 1,
        mb: 2,
        mt: 1,
        maxWidth: "100%",
        overflowX: "never",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          color: "#b8c7dc",
          fontSize: "0.8rem",
          fontWeight: 600,
        }}
      >
        Layer
      </Box>
      {[...Array(props.layerCount)].map((_, idx) => {
        const isActive = props.currentLayer === idx;
        return (
          <Button
            key={idx}
            value={idx}
            variant="outlined"
            size="small"
            sx={{
              minWidth: "36px",
              flexShrink: 0,
              color: isActive ? "#e5eefb" : "#8fa4bd",
              borderColor: isActive ? "#596777" : "#294b70",
              backgroundColor: isActive ? "#3f4b5a" : "#111d2d",
              "&:hover": {
                borderColor: "#596777",
                backgroundColor: "#2d3d4f",
              },
            }}
            onClick={() => {
              props.onChange(idx);
            }}
          >
            {idx}
          </Button>
        );
      })}
    </Box>
  );
}
