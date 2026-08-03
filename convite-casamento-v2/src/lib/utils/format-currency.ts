export function formatCurrencyInputBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function parseCurrencyBR(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const normalized = text.includes(",")
    ? text.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".")
    : text.replace(/[^\d.-]/g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

export function formatCurrencyBR(value: string | number | null | undefined) {
  const amount = parseCurrencyBR(value);
  if (amount !== null) {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const text = String(value ?? "").trim();
  return text || "Valor não informado";
}
