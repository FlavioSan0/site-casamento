import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const shell = fs.readFileSync(
  new URL("../src/components/admin/admin-shell.tsx", import.meta.url),
  "utf8",
);
const shellCss = fs.readFileSync(
  new URL("../src/components/admin/admin-shell.module.css", import.meta.url),
  "utf8",
);
const globalCss = fs.readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);

test("painel mobile usa navegação inferior fixa e acessível", () => {
  assert.match(shell, /Navegação inferior do painel/);
  assert.match(shell, /bottomNavItemActive/);
  assert.match(shellCss, /grid-template-columns:\s*repeat\(5/);
  assert.match(shellCss, /env\(safe-area-inset-bottom\)/);
  assert.match(shellCss, /position:\s*fixed/);
});

test("conteúdo e ações respeitam o menu inferior", () => {
  assert.match(globalCss, /--admin-mobile-nav-height/);
  assert.match(globalCss, /bottom:\s*calc\(var\(--admin-mobile-nav-height\)/);
  assert.match(globalCss, /max-height:\s*calc\(100dvh - 18px\)/);
  assert.match(globalCss, /font-size:\s*16px/);
});
