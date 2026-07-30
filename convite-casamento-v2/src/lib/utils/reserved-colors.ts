export type ReservedDressColor = {
  nome: string;
  cor: string;
};

export const MAX_RESERVED_DRESS_COLORS = 8;

export const DEFAULT_RESERVED_DRESS_COLORS: ReservedDressColor[] = [
  { nome: "Azul-marinho", cor: "#08265E" },
  { nome: "Bordô", cor: "#800000" },
  { nome: "Verde", cor: "#3F6B4A" },
];

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeReservedDressColors(
  value: unknown,
  fallback: ReservedDressColor[] = DEFAULT_RESERVED_DRESS_COLORS,
): ReservedDressColor[] {
  if (!Array.isArray(value)) {
    return fallback.map((item) => ({ ...item }));
  }

  return value
    .slice(0, MAX_RESERVED_DRESS_COLORS)
    .map((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;

      const entry = item as Record<string, unknown>;
      const cor = isHexColor(entry.cor) ? entry.cor.trim().toUpperCase() : null;
      if (!cor) return null;

      const nome =
        typeof entry.nome === "string" && entry.nome.trim()
          ? entry.nome.trim().slice(0, 40)
          : `Cor reservada ${index + 1}`;

      return { nome, cor };
    })
    .filter((item): item is ReservedDressColor => Boolean(item));
}

export function validateReservedDressColors(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("A paleta de cores reservadas deve ser uma lista.");
  }

  if (value.length > MAX_RESERVED_DRESS_COLORS) {
    throw new Error(
      `A paleta pode ter no máximo ${MAX_RESERVED_DRESS_COLORS} cores.`,
    );
  }

  const normalized = normalizeReservedDressColors(value, []);
  if (normalized.length !== value.length) {
    throw new Error(
      "Cada cor reservada deve ter um nome e uma cor no formato #RRGGBB.",
    );
  }

  return normalized;
}
