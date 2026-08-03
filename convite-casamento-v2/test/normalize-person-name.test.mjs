import assert from "node:assert/strict";
import test from "node:test";
import {
  confirmationNameKeys,
  findUniqueConfirmationByName,
  findUniqueConfirmationMatchByName,
  meaningfulNameTokens,
  normalizePersonName,
} from "../src/lib/utils/normalize-person-name.ts";

test("normaliza acentos, pontuação e espaços", () => {
  assert.equal(normalizePersonName("  Jéssica  da-Silva "), "jessica da silva");
});

test("remove partículas dos tokens úteis", () => {
  assert.deepEqual(meaningfulNameTokens("Emerson Rodrigues da Silva"), [
    "emerson",
    "rodrigues",
    "silva",
  ]);
});

test("inclui titular e acompanhantes nas chaves", () => {
  assert.deepEqual(
    confirmationNameKeys({
      id: 1,
      nome: "Bernardo",
      nomes_acompanhantes: ["Francisca", ""],
    }),
    ["bernardo", "francisca"],
  );
});

test("encontra correspondência exata única", () => {
  const confirmation = findUniqueConfirmationByName("JESSICA DA SILVA", [
    { id: 1, nome: "Jéssica da Silva" },
    { id: 2, nome: "Maria" },
  ]);

  assert.equal(confirmation?.id, 1);
});

test("relaciona nome abreviado com nome completo quando é único", () => {
  const match = findUniqueConfirmationMatchByName("Emerson Rodrigues", [
    { id: 1, nome: "Emerson Rodrigues da Silva" },
    { id: 2, nome: "Carlos Pereira" },
  ]);

  assert.equal(match?.confirmation.id, 1);
  assert.equal(match?.kind, "partial");
});

test("relaciona sobrenome ou apelido único com segurança", () => {
  const match = findUniqueConfirmationMatchByName("Pontes", [
    { id: 1, nome: "João Carlos Pontes" },
    { id: 2, nome: "Carlos Pereira" },
  ]);

  assert.equal(match?.confirmation.id, 1);
  assert.equal(match?.kind, "single-token");
});

test("não escolhe automaticamente quando o token é ambíguo", () => {
  const match = findUniqueConfirmationMatchByName("Silva", [
    { id: 1, nome: "João da Silva" },
    { id: 2, nome: "Maria Silva" },
  ]);

  assert.equal(match, null);
});

test("considera acompanhante no casamento por nome", () => {
  const confirmation = findUniqueConfirmationByName("Francisca", [
    {
      id: 1,
      nome: "Bernardo",
      nomes_acompanhantes: ["Francisca"],
    },
  ]);

  assert.equal(confirmation?.id, 1);
});
