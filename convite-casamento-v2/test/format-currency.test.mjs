import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCurrencyBR,
  formatCurrencyInputBR,
  parseCurrencyBR,
} from "../src/lib/utils/format-currency.ts";

test("aplica máscara monetária brasileira", () => {
  assert.equal(formatCurrencyInputBR("12000"), "R$ 120,00");
  assert.equal(formatCurrencyInputBR("R$ 1.234,56"), "R$ 1.234,56");
  assert.equal(formatCurrencyInputBR(""), "");
});

test("normaliza e apresenta valores cadastrados nos presentes", () => {
  assert.equal(parseCurrencyBR("R$ 1.234,56"), 1234.56);
  assert.equal(parseCurrencyBR("250.5"), 250.5);
  assert.match(formatCurrencyBR("R$ 250,00"), /R\$\s250,00/);
  assert.equal(formatCurrencyBR(null), "Valor não informado");
});
