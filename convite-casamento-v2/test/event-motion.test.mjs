import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  EVENT_OPENING_FALLBACK_MS,
  nextOpeningPhase,
  shouldPlayEventOpening,
} from "../src/lib/utils/event-motion.ts";

test("abertura toca somente na primeira visita sem movimento reduzido", () => {
  assert.equal(shouldPlayEventOpening(false, false), true);
  assert.equal(shouldPlayEventOpening(true, false), false);
  assert.equal(shouldPlayEventOpening(false, true), false);
});

test("a carta segue uma única sequência e tem fallback limitado", () => {
  const sequence = [
    "checking",
    "entering",
    "opening",
    "revealing",
    "closing",
    "complete",
  ];

  assert.deepEqual(
    sequence.slice(0, -1).map((phase) => nextOpeningPhase(phase)),
    sequence.slice(1),
  );
  assert.equal(nextOpeningPhase("complete"), "complete");
  assert.ok(EVENT_OPENING_FALLBACK_MS <= 2500);
});

test("arquitetura não anima cards e Reveal simultaneamente", async () => {
  const [css, page, reveal, opening, layoutPanel] = await Promise.all([
    readFile(new URL("../src/app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../src/app/evento/[slug]/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/event/reveal.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../src/components/event/event-opening.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../src/components/admin/layout-settings-panel.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.equal(css.includes(".reveal--group"), false);
  assert.equal(css.includes("@keyframes reveal-card"), false);
  assert.equal(page.includes("<Reveal group"), false);
  assert.match(css, /data-hero-entry="after-opening".*\.hero-title/s);
  assert.match(css, /@keyframes wedding-envelope-flap-open/);
  assert.match(css, /@keyframes wedding-card-rise/);
  assert.equal(css.includes("@keyframes event-opening-in"), false);
  assert.equal(css.includes("transition: all"), false);
  assert.equal(reveal.match(/new IntersectionObserver/g)?.length, 1);
  assert.match(reveal, /disconnect\(\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(opening, /suppressHydrationWarning/);
  assert.match(opening, /wedding-opening-seen:/);
  assert.match(opening, /onAnimationEnd=\{handleAnimationEnd\}/);
  assert.match(opening, /document\.body\.style\.overflow/);
  assert.match(opening, /if \(!preview\)/);
  assert.match(layoutPanel, /Visualizar abertura/);
  assert.match(layoutPanel, /preview\s+onComplete/);
});
