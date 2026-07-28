"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

export function useAdminModal(
  isOpen: boolean,
  onClose: () => void,
  locked = false,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const returnFocus = returnFocusRef?.current || previousFocus;
    const previousOverflow = document.body.style.overflow;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !locked) {
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const modal = document.querySelector<HTMLElement>(".admin-modal-card");
      const controls = modal
        ? [...modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          )].filter((element) => element.offsetParent !== null)
        : [];
      const first = controls[0];
      const last = controls[controls.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, [isOpen, locked, onClose, returnFocusRef]);
}
