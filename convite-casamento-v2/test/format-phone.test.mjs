import assert from "node:assert/strict";
import test from "node:test";
import { formatPhoneBR } from "../src/lib/utils/format-phone.ts";

test("formata e limita telefones brasileiros", () => {
  assert.equal(formatPhoneBR("11987654321"), "(11) 98765-4321");
  assert.equal(formatPhoneBR("(11) 3456-7890"), "(11) 3456-7890");
  assert.equal(formatPhoneBR("11987654321999"), "(11) 98765-4321");
});
