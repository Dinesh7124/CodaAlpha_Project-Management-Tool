import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts, deps = []) {
  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target?.tagName || "").toUpperCase();
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable;

      for (const [key, fn] of Object.entries(shortcuts)) {
        const keyMatch = e.key.toLowerCase() === key.toLowerCase();
        const isEscape = key.toLowerCase() === "escape";

        if (isEscape && keyMatch) {
          e.preventDefault();
          fn(e);
          return;
        }

        if (!isTyping && keyMatch && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          fn(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, deps);
}
