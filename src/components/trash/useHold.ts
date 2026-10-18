"use client";

import { useEffect, useRef, type RefObject } from "react";

const HOLD_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * Segurar o card (dedo parado ~meio segundo) ou clique direito chama `onHold`.
 * O card é o ancestral mais próximo de `anchor` com `data-hold-menu`.
 * Depois de segurar, o toque não abre o link do card.
 */
export function useHold(anchor: RefObject<HTMLElement | null>, onHold: () => void) {
  const cb = useRef(onHold);
  useEffect(() => {
    cb.current = onHold;
  });

  useEffect(() => {
    const card = anchor.current?.closest<HTMLElement>("[data-hold-menu]");
    if (!card) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;
    let x = 0;
    let y = 0;

    // Toques dentro da folha aberta (ela mora dentro do card) não contam.
    const ignore = (e: Event) => e.target instanceof Element && !!e.target.closest("dialog");
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const hold = () => {
      stop();
      fired = true;
      navigator.vibrate?.(15);
      cb.current();
    };

    const down = (e: PointerEvent) => {
      if (ignore(e)) return;
      fired = false;
      if (e.pointerType === "mouse") return;
      x = e.clientX;
      y = e.clientY;
      stop();
      timer = setTimeout(hold, HOLD_MS);
    };
    const move = (e: PointerEvent) => {
      if (timer && Math.hypot(e.clientX - x, e.clientY - y) > MOVE_TOLERANCE) stop();
    };
    const menu = (e: MouseEvent) => {
      if (ignore(e)) return;
      e.preventDefault();
      if (!fired) hold();
    };
    const click = (e: MouseEvent) => {
      if (!fired || ignore(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fired = false;
    };

    card.addEventListener("pointerdown", down);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", stop);
    card.addEventListener("pointercancel", stop);
    card.addEventListener("contextmenu", menu);
    card.addEventListener("click", click, true);
    return () => {
      stop();
      card.removeEventListener("pointerdown", down);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", stop);
      card.removeEventListener("pointercancel", stop);
      card.removeEventListener("contextmenu", menu);
      card.removeEventListener("click", click, true);
    };
  }, [anchor]);
}
