import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWhatsAppUrl,
  fillMessageTemplate,
  getMessageTemplate,
  isValidBrazilianPhone,
  normalizePhoneDigits,
  toWhatsAppNumber,
} from "../src/lib/utils/whatsapp.ts";

test("normaliza telefones brasileiros e remove o DDI", () => {
  assert.equal(normalizePhoneDigits("+55 (84) 99999-9999"), "84999999999");
  assert.equal(normalizePhoneDigits("(84) 3333-2222"), "8433332222");
  assert.equal(toWhatsAppNumber("84999999999"), "5584999999999");
  assert.equal(isValidBrazilianPhone("123"), false);
});

test("preenche variáveis e gera URL segura do WhatsApp", () => {
  const message = fillMessageTemplate("Olá, {nome}! Presente: {presente}", {
    nome: "Ana",
    presente: "Jogo de panelas",
  });
  assert.equal(message, "Olá, Ana! Presente: Jogo de panelas");
  assert.match(buildWhatsAppUrl("84999999999", message), /^https:\/\/wa\.me\/5584999999999\?text=/);
});

test("modelo de lembrete inclui presente, valor e bloco PIX", () => {
  const template = getMessageTemplate("gift_reminder").template;
  const message = fillMessageTemplate(template, {
    nome: "Carlos",
    presente: "Jogo de cama",
    valor_presente: "R$ 250,00",
    resumo_presentes: "• Jogo de cama — R$ 250,00",
    chave_pix: "flavio@example.com",
    pix_reserva:
      "Para concluir o presente, você pode realizar o envio pela chave PIX:\nflavio@example.com",
  });

  assert.match(message, /Jogo de cama/);
  assert.match(message, /R\$ 250,00/);
  assert.match(message, /chave PIX/);
  assert.match(message, /flavio@example\.com/);
});

test("modelo de agradecimento usa o resumo dos presentes recebidos", () => {
  const template = getMessageTemplate("gift_received_thanks").template;
  const message = fillMessageTemplate(template, {
    nome: "Carlos",
    resumo_presentes: "• Jogo de cama — R$ 250,00",
  });

  assert.match(message, /Recebemos o presente/);
  assert.match(message, /Jogo de cama/);
  assert.match(message, /R\$ 250,00/);
});
