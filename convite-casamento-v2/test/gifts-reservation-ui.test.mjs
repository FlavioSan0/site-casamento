import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("presentes usam grid responsivo, modal de confirmação e toast", async () => {
  const [component, css] = await Promise.all([
    readFile(
      new URL("../src/components/event/gifts-section.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /Confirmar reserva/);
  assert.match(component, /gift-reservation-toast/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /wedding-gift-contact:/);
  assert.equal(component.includes("expandedId"), false);
  assert.equal(component.includes("gift-card-refined__form"), false);

  assert.match(
    css,
    /\.gift-grid-refined,\s*\.gift-grid-refined--enhanced\s*\{[^}]*grid-template-columns:\s*repeat\(3,/s,
  );
  assert.match(css, /\.gift-reservation-modal\s*\{/);
  assert.match(css, /\.gift-reservation-toast\s*\{/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
