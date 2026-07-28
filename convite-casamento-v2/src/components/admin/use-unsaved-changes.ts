"use client";

import { useEffect } from "react";

export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const beforeNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href === window.location.href
      ) {
        return;
      }

      if (!window.confirm("Descartar as alteraÃ§Ãµes nÃ£o salvas?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeNavigation, true);
    };
  }, [hasChanges]);
}
