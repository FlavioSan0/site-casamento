import assert from "node:assert/strict";
import test from "node:test";
import { formatCurrencyInputBR } from "../src/lib/utils/format-currency.ts";

test("aplica máscara monetária brasileira", () => {
  assert.equal(formatCurrencyInputBR("12000"), "R$ 120,00");
  assert.equal(formatCurrencyInputBR("R$ 1.234,56"), "R$ 1.234,56");
  assert.equal(formatCurrencyInputBR(""), "");
});
