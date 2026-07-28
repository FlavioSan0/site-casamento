export function formatCurrencyInputBR(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 12);
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
