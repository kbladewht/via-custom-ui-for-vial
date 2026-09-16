import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { QmkKeycode } from "./keycodes/keycodeConverter";

/**
 * The hint area a key belongs to (one per keymap view / editor / keycode list). All tab panels stay
 * mounted (the hidden ones are just hidden with CSS), so a key reports its hovers only to the hint of
 * its own area and never to the hint of another tab.
 */
export const KeySettingHintAreaContext = createContext<string | null>(null);

export type KeySettingHintTarget = { keycode: QmkKeycode; anchor: HTMLElement };

/** Event dispatched by the keys / keycodes when the pointer enters or leaves them. */
const HOVER_EVENT = "vial-key-setting-hint-hover";

type HoverDetail = { areaId: string; keycode: QmkKeycode; anchor: HTMLElement | null };

/**
 * Reports that the pointer entered a key / keycode (anchor = the element) or left it (anchor = null).
 */
export function keySettingHintHover(
  areaId: string,
  keycode: QmkKeycode,
  anchor: HTMLElement | null,
) {
  window.dispatchEvent(
    new CustomEvent<HoverDetail>(HOVER_EVENT, { detail: { areaId, keycode, anchor } }),
  );
}

/**
 * Mouse handlers for a key / keycode inside a hint area: hover it and hold Ctrl to see its hint.
 * Returns no handlers outside of such an area (e.g. in the macro editor).
 */
export function useKeySettingHintHoverHandlers(keycode: QmkKeycode) {
  const areaId = useContext(KeySettingHintAreaContext);
  if (areaId === null) return {};
  return {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) =>
      keySettingHintHover(areaId, keycode, event.currentTarget),
    onMouseLeave: () => keySettingHintHover(areaId, keycode, null),
  };
}

/**
 * Hover a key (or a keycode in the list) and hold Ctrl to see what it does: the hint is shown for
 * whatever the pointer is over. Releasing Ctrl, leaving the key or clicking anywhere else hides it
 * again. Wrap the keys of the view in
 * `<KeySettingHintAreaContext.Provider value={hintAreaId}>` so they report to this hint.
 */
export function useKeySettingHint() {
  const hintAreaId = useId();
  const [hintTarget, setHintTarget] = useState<KeySettingHintTarget | null>(null);
  const hoveredTarget = useRef<KeySettingHintTarget | null>(null);
  const ctrlDown = useRef(false);

  useEffect(() => {
    const onHover = (event: Event) => {
      const { areaId, keycode, anchor } = (event as CustomEvent<HoverDetail>).detail;
      if (areaId !== hintAreaId) return;
      hoveredTarget.current = anchor === null ? null : { keycode, anchor };
      setHintTarget(ctrlDown.current && anchor !== null ? { keycode, anchor } : null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Control") return;
      ctrlDown.current = true;
      if (hoveredTarget.current) setHintTarget(hoveredTarget.current);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Control") return;
      ctrlDown.current = false;
      setHintTarget(null);
    };
    window.addEventListener(HOVER_EVENT, onHover);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener(HOVER_EVENT, onHover);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [hintAreaId]);

  return {
    hintTarget,
    /** Id to pass to KeySettingHintAreaContext.Provider around the keys of this view. */
    hintAreaId,
    /** Shows the hint for a key that was clicked while Ctrl was held. */
    hintClick: useCallback(
      (keycode: QmkKeycode, anchor: HTMLElement) => setHintTarget({ keycode, anchor }),
      [],
    ),
    closeHint: useCallback(() => setHintTarget(null), []),
  };
}
