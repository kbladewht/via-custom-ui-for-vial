import { Box, Tab, Tabs, Tooltip } from "@mui/material";
import { useContext, useState } from "react";
import { match, P } from "ts-pattern";
import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "./keycodes/keycodeConverter";
import { FocusedKeyContext } from "./KeymapEditor";

const WIDTH_1U = 50;
const BASIC_KEYBOARD_ROWS: (string | null)[][] = [
  [
    "KC_ESCAPE",
    null,
    "KC_F1",
    "KC_F2",
    "KC_F3",
    "KC_F4",
    "KC_F5",
    "KC_F6",
    "KC_F7",
    "KC_F8",
    "KC_F9",
    "KC_F10",
    "KC_F11",
    "KC_F12",
  ],
  [
    "KC_GRAVE",
    "KC_1",
    "KC_2",
    "KC_3",
    "KC_4",
    "KC_5",
    "KC_6",
    "KC_7",
    "KC_8",
    "KC_9",
    "KC_0",
    "KC_MINUS",
    "KC_EQUAL",
    "KC_BACKSPACE",
  ],
  [
    "KC_TAB",
    "KC_Q",
    "KC_W",
    "KC_E",
    "KC_R",
    "KC_T",
    "KC_Y",
    "KC_U",
    "KC_I",
    "KC_O",
    "KC_P",
    "KC_LEFT_BRACKET",
    "KC_RIGHT_BRACKET",
    "KC_BACKSLASH",
  ],
  [
    "KC_CAPS_LOCK",
    "KC_A",
    "KC_S",
    "KC_D",
    "KC_F",
    "KC_G",
    "KC_H",
    "KC_J",
    "KC_K",
    "KC_L",
    "KC_SEMICOLON",
    "KC_QUOTE",
    "KC_ENTER",
  ],
  [
    "KC_LEFT_SHIFT",
    "KC_Z",
    "KC_X",
    "KC_C",
    "KC_V",
    "KC_B",
    "KC_N",
    "KC_M",
    "KC_COMMA",
    "KC_DOT",
    "KC_SLASH",
    "KC_RIGHT_SHIFT",
  ],
  [
    "KC_LEFT_CTRL",
    "KC_LEFT_GUI",
    "KC_LEFT_ALT",
    "KC_SPACE",
    "KC_RIGHT_ALT",
    "KC_RIGHT_GUI",
    "KC_APPLICATION",
    "KC_RIGHT_CTRL",
  ],
];
const NUMPAD_ROWS: (string | null)[][] = [
  ["KC_NUM_LOCK", "KC_KP_SLASH", "KC_KP_ASTERISK", "KC_KP_MINUS"],
  ["KC_KP_7", "KC_KP_8", "KC_KP_9", "KC_KP_PLUS"],
  ["KC_KP_4", "KC_KP_5", "KC_KP_6", "KC_KP_COMMA"],
  ["KC_KP_1", "KC_KP_2", "KC_KP_3", "KC_KP_EQUAL_AS400"],
  ["KC_KP_0", "KC_KP_DOT", "KC_KP_ENTER", null],
];
const NAVIGATION_ROWS: (string | null)[][] = [
  ["KC_PRINT_SCREEN", "KC_SCROLL_LOCK", "KC_PAUSE"],
  ["KC_INSERT", "KC_HOME", "KC_PAGE_UP"],
  ["KC_DELETE", "KC_END", "KC_PAGE_DOWN"],
  [null, null, null],
  [null, "KC_UP", null],
  ["KC_LEFT", "KC_DOWN", "KC_RIGHT"],
];
const BASIC_KEY_WIDTHS: Record<string, number> = {
  KC_BACKSPACE: 2,
  KC_TAB: 1.5,
  KC_BACKSLASH: 1.5,
  KC_CAPS_LOCK: 1.75,
  KC_ENTER: 2.25,
  KC_LEFT_SHIFT: 2.25,
  KC_RIGHT_SHIFT: 2.75,
  KC_LEFT_CTRL: 1.25,
  KC_SPACE: 7,
  KC_RIGHT_CTRL: 1.25,
  KC_LEFT_GUI: 1.25,
  KC_LEFT_ALT: 1.25,
  KC_KP_0: 2,
};
const BASIC_KEY_MARGIN_RIGHT: Record<string, number> = {
  KC_F4: 25,
  KC_F8: 25,
};

function KeyListKey(props: {
  keycode: QmkKeycode;
  onClick?: () => void;
  draggable: boolean;
  widthMultiplier?: number;
  marginRight?: number;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [showToolTip, setShowToolTip] = useState(false);

  const focusContext = useContext(FocusedKeyContext);

  return (
    <Tooltip
      open={showToolTip}
      onOpen={() => {
        setShowToolTip(true);
      }}
      onClose={() => {
        setShowToolTip(false);
      }}
      title={`${props.keycode.key}(${props.keycode.value.toString()})`}
      placement="top"
    >
      <div
        className="keycatalog-key"
        style={{
          width:
            (WIDTH_1U - 3) * (props.widthMultiplier ?? 1) +
            5 * ((props.widthMultiplier ?? 1) - 1),
          height: WIDTH_1U - 3,
          marginRight: props.marginRight,
        }}
        draggable={props.draggable}
        onDragStart={(event) => {
          if (props.draggable) {
            event.dataTransfer.setData("QmkKeycode", JSON.stringify(props.keycode));
            setIsDragging(true);
          }
        }}
        onDragEnd={(_event) => {
          if (props.draggable) {
            setIsDragging(false);
          }
        }}
        onMouseMove={(event) => {
          if (!isDragging) return;
          const { clientX, clientY } = event;
          const scrollArea = 50;
          const scrollSpeed = 10;

          if (clientX < scrollArea) {
            window.scrollBy(-scrollSpeed, 0);
          } else if (window.innerWidth - clientX < scrollArea) {
            window.scrollBy(scrollSpeed, 0);
          }

          if (clientY < scrollArea) {
            window.scrollBy(0, -scrollSpeed);
          } else if (window.innerHeight - clientY < scrollArea) {
            window.scrollBy(0, scrollSpeed);
          }
        }}
        onMouseLeave={(_event) => {
          setShowToolTip(false);
        }}
        onClick={() => {
          if (focusContext.focusedKey && focusContext.onKeycodeChange) {
            focusContext.onKeycodeChange(focusContext.focusedKey, props.keycode);
          } else if (props.onClick) {
            setShowToolTip(false);
            props.onClick?.();
          }
        }}
      >
        <div>{props.keycode.shiftedLabel ?? ""}</div>
        <div>{props.keycode.label}</div>
      </div>
    </Tooltip>
  );
}

function BasicKeyboardLayout(props: { keycodes: QmkKeycode[] }) {
  const keycodeMap = new Map(props.keycodes.map((keycode) => [keycode.key, keycode]));
  const layoutKeys = new Set(
    [...BASIC_KEYBOARD_ROWS, ...NUMPAD_ROWS, ...NAVIGATION_ROWS]
      .flat()
      .filter((key): key is string => key !== null),
  );
  const renderKey = (key: string | null, index: number) => {
    const keycode = key === null ? undefined : keycodeMap.get(key);
    return keycode ? (
      <KeyListKey
        key={keycode.value}
        keycode={keycode}
        draggable={true}
        widthMultiplier={key ? BASIC_KEY_WIDTHS[key] : undefined}
        marginRight={key ? BASIC_KEY_MARGIN_RIGHT[key] : undefined}
      />
    ) : (
      <Box key={`empty-${index}`} sx={{ width: WIDTH_1U - 3, height: WIDTH_1U - 3 }} />
    );
  };

  const remainingKeys = props.keycodes.filter((keycode) => !layoutKeys.has(keycode.key));

  return (
    <>
      <Box sx={{ display: "flex", gap: "18px", ml: 1, mb: 1, minWidth: "min-content" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {BASIC_KEYBOARD_ROWS.map((row, rowIndex) => (
            <Box key={rowIndex} sx={{ display: "flex", gap: "5px" }}>
              {row.map(renderKey)}
            </Box>
          ))}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {NAVIGATION_ROWS.map((row, rowIndex) => (
            <Box key={rowIndex} sx={{ display: "flex", gap: "5px" }}>
              {row.map(renderKey)}
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            mt: `${WIDTH_1U + 5}px`,
          }}
        >
          {NUMPAD_ROWS.map((row, rowIndex) => (
            <Box key={rowIndex} sx={{ display: "flex", gap: "5px" }}>
              {row.map(renderKey)}
            </Box>
          ))}
        </Box>
      </Box>
      {remainingKeys.length > 0 && (
        <>
          <Box sx={{ mt: 1 }}>Other</Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, ${WIDTH_1U}px)`,
              gap: "8px 5px",
              ml: 1,
              mb: 1,
              minWidth: "min-content",
            }}
          >
            {remainingKeys.map((keycode) => (
              <KeyListKey key={keycode.value} keycode={keycode} draggable={true} />
            ))}
          </Box>
        </>
      )}
    </>
  );
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3, pt: 0 }}>{children}</Box>}
    </div>
  );
}

export function KeycodeCatalog(props: {
  keycodeConverter: KeycodeConverter;
  tab: { label: string; keygroup: string[] }[];
  comboCount?: number;
  overrideCount?: number;
  onMacroSelect?: (index: number) => void;
  onTapdanceSelect?: (index: number) => void;
  onComoboSelect?: (index: number) => void;
  onOverrideSelect?: (index: number) => void;
}) {
  const [tabValue, setTabValue] = useState(0);
  return (
    <>
      <Box>
        <Tabs
          value={tabValue}
          onChange={(_event, newValue: number) => {
            setTabValue(newValue);
            console.log("tab");
          }}
          variant="scrollable"
          scrollButtons={true}
          sx={{ width: "100%", maxWidth: "100%" }}
        >
          {props.tab.map((tab) => (
            <Tab key={tab.label} label={tab.label} className="keycode-catalog-tab"></Tab>
          ))}
        </Tabs>
      </Box>
      {props.tab.map((tab, index) => (
        <CustomTabPanel key={index} value={tabValue} index={index}>
          {tab.keygroup.map((keygroup) => (
            <Box key={keygroup} sx={{ maxWidth: "100%", overflowX: "auto" }}>
              {keygroup === "basic" ? (
                <>
                  <Box sx={{ mt: 1 }}>basic</Box>
                  <BasicKeyboardLayout
                    keycodes={props.keycodeConverter
                      .getTapKeycodeList()
                      .filter((keycode) =>
                        keycode.group === "basic" || keycode.group === "modifiers",
                      )}
                  />
                </>
              ) : keygroup === "modifiers" ? (
                <></>
              ) : props.keycodeConverter.getTapKeycodeList().some((k) => k.group === keygroup) ? (
                <>
                  <Box sx={{ mt: 1 }}>{keygroup}</Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fill, ${WIDTH_1U}px)`,
                      gap: "8px 5px",
                      ml: 1,
                      mb: 1,
                      minWidth: "min-content",
                    }}
                  >
                    {props.keycodeConverter
                      .getTapKeycodeList()
                      .filter((k) => k.group === keygroup)
                      .map((keycode) => {
                        return match(keycode.group)
                          .with("tapdance", () => (
                            <KeyListKey
                              key={keycode.value}
                              keycode={{ ...keycode, label: keycode.label + " 🖊" }}
                              draggable={true}
                              onClick={() => {
                                props.onTapdanceSelect?.(keycode.value & 0x1f);
                              }}
                            ></KeyListKey>
                          ))
                          .with("macro", () => (
                            <KeyListKey
                              key={keycode.value}
                              keycode={{ ...keycode, label: keycode.label + " 🖊" }}
                              draggable={true}
                              onClick={() => {
                                props.onMacroSelect?.(keycode.value & 0x1f);
                              }}
                            ></KeyListKey>
                          ))
                          .with(P._, () => (
                            <KeyListKey
                              key={keycode.value}
                              keycode={keycode}
                              draggable={true}
                            ></KeyListKey>
                          ))
                          .exhaustive();
                      })}
                  </Box>
                </>
              ) : keygroup === "combo" ? (
                <>
                  <Box sx={{ mt: 1 }}>{keygroup}</Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fit, ${WIDTH_1U}px)`,
                      gap: "8px 5px",
                    }}
                  >
                    {[...Array(props.comboCount)].map((_, idx) => (
                      <KeyListKey
                        key={`combo-${idx}`}
                        keycode={{
                          ...DefaultQmkKeycode,
                          label: `Combo ${idx} 🖊`,
                          key: `Edit Combo`,
                          value: idx,
                        }}
                        draggable={false}
                        onClick={() => {
                          props.onComoboSelect?.(idx);
                        }}
                      ></KeyListKey>
                    ))}
                  </Box>
                </>
              ) : keygroup === "keyoverride" ? (
                <>
                  <Box sx={{ mt: 1 }}>{keygroup}</Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: `repeat(auto-fit, ${WIDTH_1U}px)`,
                      gap: "8px 5px",
                    }}
                  >
                    {[...Array(props.overrideCount)].map((_, idx) => (
                      <KeyListKey
                        key={`override-${idx}`}
                        keycode={{
                          ...DefaultQmkKeycode,
                          label: `Override ${idx} 🖊`,
                          key: `Edit override`,
                          value: idx,
                        }}
                        draggable={false}
                        onClick={() => {
                          props.onOverrideSelect?.(idx);
                        }}
                      ></KeyListKey>
                    ))}
                  </Box>
                </>
              ) : (
                <></>
              )}
            </Box>
          ))}
        </CustomTabPanel>
      ))}
    </>
  );
}
