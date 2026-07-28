export type ThemeConfig = {
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_acento?: string | null;
  cor_fundo?: string | null;
  cor_superficie?: string | null;
  modelo_layout?: string | null;
};

function normalizeHex(value: string | null | undefined, fallback: string) {
  const trimmed = String(value || "").trim();
  const isValid = /^#([0-9A-Fa-f]{6})$/.test(trimmed);
  return isValid ? trimmed : fallback;
}

export function getThemeConfig(config?: ThemeConfig | null) {
  return {
    cor_primaria: normalizeHex(config?.cor_primaria, "#800000"),
    cor_secundaria: normalizeHex(config?.cor_secundaria, "#08265e"),
    cor_acento: normalizeHex(config?.cor_acento, "#c9a227"),
    cor_fundo: normalizeHex(config?.cor_fundo, "#fffaf8"),
    cor_superficie: normalizeHex(config?.cor_superficie, "#ffffff"),
    modelo_layout: config?.modelo_layout || "classic",
  };
}

export function buildThemeStyle(config?: ThemeConfig | null) {
  const theme = getThemeConfig(config);

  return {
    ["--theme-primary" as string]: theme.cor_primaria,
    ["--theme-secondary" as string]: theme.cor_secundaria,
    ["--theme-accent" as string]: theme.cor_acento,
    ["--theme-bg" as string]: theme.cor_fundo,
    ["--theme-surface" as string]: theme.cor_superficie,
  } as React.CSSProperties;
}