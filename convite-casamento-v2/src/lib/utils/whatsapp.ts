export type MessageTemplateKey =
  | "confirmation_reminder"
  | "confirmation_received"
  | "gift_reminder"
  | "gift_received_thanks"
  | "gift_without_confirmation"
  | "wedding_reminder"
  | "location_update"
  | "custom";

export type MessageTemplateValues = {
  nome: string;
  data: string;
  hora: string;
  presente: string;
  valor_presente: string;
  resumo_presentes: string;
  quantidade_pessoas: string;
  local_cerimonia: string;
  local_recepcao: string;
  link_cerimonia: string;
  link_recepcao: string;
  link_convite: string;
  chave_pix: string;
  pix_reserva: string;
};

export const MESSAGE_TEMPLATES: Array<{
  key: MessageTemplateKey;
  label: string;
  description: string;
  template: string;
}> = [
  {
    key: "confirmation_reminder",
    label: "Lembrar confirmação",
    description: "Para quem ainda não confirmou presença.",
    template:
      "Olá, {nome}! Tudo bem?\n\nEstamos passando para lembrar da confirmação de presença no nosso casamento, no dia {data}.\n\nVocê pode confirmar pelo convite digital:\n{link_convite}\n\nSerá muito especial ter você conosco!",
  },
  {
    key: "confirmation_received",
    label: "Confirmação recebida",
    description: "Agradecimento após o RSVP.",
    template:
      "Olá, {nome}!\n\nRecebemos sua confirmação de presença e ficamos muito felizes em saber que você estará conosco nesse momento tão especial.\n\nNos vemos no dia {data}, às {hora}!",
  },
  {
    key: "gift_reminder",
    label: "Lembrar presente reservado",
    description:
      "Lembrete carinhoso com presente, valor e chave PIX cadastrada no financeiro.",
    template:
      "Olá, {nome}! Tudo bem?\n\nVimos que você reservou:\n{resumo_presentes}\n\n{pix_reserva}\n\nEstamos enviando apenas um lembrete carinhoso sobre a reserva. Caso já tenha realizado o envio, pode desconsiderar esta mensagem.\n\nMuito obrigado por fazer parte desse momento conosco!",
  },
  {
    key: "gift_received_thanks",
    label: "Agradecer presente recebido",
    description: "Agradecimento para reservas que já foram marcadas como recebidas.",
    template:
      "Olá, {nome}! Tudo bem?\n\nRecebemos o presente abaixo:\n{resumo_presentes}\n\nMuito obrigado pelo carinho e por fazer parte desse momento tão especial conosco!",
  },
  {
    key: "gift_without_confirmation",
    label: "Reserva sem confirmação",
    description: "Para quem reservou presente, mas ainda não confirmou presença.",
    template:
      "Olá, {nome}! Tudo bem?\n\nVimos que você reservou:\n{resumo_presentes}\n\nMas ainda não localizamos sua confirmação de presença.\n\nVocê pode confirmar por aqui:\n{link_convite}\n\nEsperamos muito celebrar esse momento com você!",
  },
  {
    key: "wedding_reminder",
    label: "Lembrança do casamento",
    description: "Lembrete geral próximo ao evento.",
    template:
      "Olá, {nome}!\n\nEstá chegando o grande dia! Nosso casamento será em {data}, às {hora}.\n\nCerimônia:\n{local_cerimonia}\n{link_cerimonia}\n\nRecepção:\n{local_recepcao}\n{link_recepcao}\n\nEstamos muito felizes em compartilhar esse momento com você!",
  },
  {
    key: "location_update",
    label: "Atualização de local",
    description: "Para informar alteração ou reforçar a localização.",
    template:
      "Olá, {nome}!\n\nTemos uma atualização importante sobre o nosso casamento.\n\nCerimônia:\n{local_cerimonia}\n{link_cerimonia}\n\nRecepção:\n{local_recepcao}\n{link_recepcao}\n\nA data e o horário permanecem: {data}, às {hora}.",
  },
  {
    key: "custom",
    label: "Mensagem personalizada",
    description: "Comece com um texto livre.",
    template: "Olá, {nome}!\n\n",
  },
];

export function normalizePhoneDigits(value: unknown) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  if (digits.length > 11) digits = digits.slice(-11);
  return digits;
}

export function isValidBrazilianPhone(value: unknown) {
  const digits = normalizePhoneDigits(value);
  return digits.length === 10 || digits.length === 11;
}

export function toWhatsAppNumber(value: unknown) {
  const digits = normalizePhoneDigits(value);
  return isValidBrazilianPhone(digits) ? `55${digits}` : "";
}

export function buildWhatsAppUrl(phone: unknown, message: string) {
  const number = toWhatsAppNumber(phone);
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`;
}

export function fillMessageTemplate(
  template: string,
  values: Partial<MessageTemplateValues>,
) {
  return template.replace(/\{([a-z_]+)\}/gi, (match, key) => {
    const value = values[key as keyof MessageTemplateValues];
    return value === undefined || value === null ? match : String(value);
  });
}

export function getMessageTemplate(key: MessageTemplateKey) {
  return MESSAGE_TEMPLATES.find((item) => item.key === key) || MESSAGE_TEMPLATES[0];
}
