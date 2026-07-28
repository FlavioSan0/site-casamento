import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChangedPatch,
  parsePatchEnvelope,
  PatchValidationError,
} from "../src/lib/utils/config-patch.ts";

test("PATCH preserva campos ausentes e mantÃ©m limpeza intencional", () => {
  const parsed = parsePatchEnvelope(
    {
      evento_id: 7,
      horario_evento: "18:30",
      data_evento: undefined,
      local_cerimonia: null,
    },
    ["horario_evento", "data_evento", "local_cerimonia"],
  );

  assert.deepEqual(parsed.fields, {
    horario_evento: "18:30",
    local_cerimonia: null,
  });
});

test("PATCH envia somente campos realmente alterados", () => {
  const saved = { horario: "17:30", cor: "#800000", pix: "abc" };
  const current = { ...saved, horario: "18:30" };

  assert.deepEqual(
    buildChangedPatch(saved, current, ["horario", "cor", "pix"]),
    { horario: "18:30" },
  );
});

test("PATCH rejeita mass assignment", () => {
  assert.throws(
    () => parsePatchEnvelope({ evento_id: 7, role: "admin" }, ["nome"]),
    PatchValidationError,
  );
});

test("regressÃ£o: grupos isolados nÃ£o carregam campos vizinhos", () => {
  const saved = {
    data_evento: "2026-08-15",
    horario_evento: "17:30",
    cor_primaria: "#800000",
    modelo_layout: "classic",
    hero_background_url: "/hero.jpg",
    chave_pix: "pix-original",
    mensagem_confirmacao: "Confirmado",
  };

  assert.deepEqual(
    buildChangedPatch(saved, { ...saved, horario_evento: "18:30" }, [
      "data_evento",
      "horario_evento",
      "cor_primaria",
      "hero_background_url",
    ]),
    { horario_evento: "18:30" },
  );
  assert.deepEqual(
    buildChangedPatch(saved, { ...saved, cor_primaria: "#123456" }, [
      "cor_primaria",
      "data_evento",
      "chave_pix",
    ]),
    { cor_primaria: "#123456" },
  );
  assert.deepEqual(
    buildChangedPatch(saved, { ...saved, modelo_layout: "editorial" }, [
      "modelo_layout",
      "hero_background_url",
      "mensagem_confirmacao",
    ]),
    { modelo_layout: "editorial" },
  );
  assert.deepEqual(
    buildChangedPatch(saved, { ...saved, chave_pix: "novo-pix" }, [
      "chave_pix",
      "cor_primaria",
      "modelo_layout",
    ]),
    { chave_pix: "novo-pix" },
  );
});

test("regressÃ£o: restaurar padrÃ£o altera somente apresentaÃ§Ã£o", () => {
  const current = {
    data_evento: "2026-08-15",
    chave_pix: "pix-original",
    mensagem_confirmacao: "Confirmado",
    cor_primaria: "#123456",
    modelo_layout: "editorial",
  };
  const restored = {
    ...current,
    cor_primaria: "#800000",
    modelo_layout: "classic",
  };

  assert.equal(restored.data_evento, current.data_evento);
  assert.equal(restored.chave_pix, current.chave_pix);
  assert.equal(restored.mensagem_confirmacao, current.mensagem_confirmacao);
});
