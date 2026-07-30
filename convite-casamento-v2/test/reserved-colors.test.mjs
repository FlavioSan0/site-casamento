import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_RESERVED_DRESS_COLORS,
  MAX_RESERVED_DRESS_COLORS,
  normalizeReservedDressColors,
  validateReservedDressColors,
} from "../src/lib/utils/reserved-colors.ts";

test("normaliza a paleta de cores reservadas", () => {
  assert.deepEqual(
    normalizeReservedDressColors([
      { nome: " Bordô ", cor: "#800000" },
      { nome: "", cor: "#08265e" },
    ]),
    [
      { nome: "Bordô", cor: "#800000" },
      { nome: "Cor reservada 2", cor: "#08265E" },
    ],
  );
});

test("usa fallback quando a coluna ainda não existe ou está vazia", () => {
  assert.deepEqual(
    normalizeReservedDressColors(undefined),
    DEFAULT_RESERVED_DRESS_COLORS,
  );
  assert.deepEqual(normalizeReservedDressColors([], []), []);
});

test("rejeita cores inválidas e excesso de itens", () => {
  assert.throws(() =>
    validateReservedDressColors([{ nome: "Inválida", cor: "vermelho" }]),
  );

  assert.throws(() =>
    validateReservedDressColors(
      Array.from({ length: MAX_RESERVED_DRESS_COLORS + 1 }, (_, index) => ({
        nome: `Cor ${index + 1}`,
        cor: "#123456",
      })),
    ),
  );
});
