import type { Metadata } from "next";
import type { ConfiguracaoEvento } from "../services/configuracoes-evento";
import type { Evento } from "../types/evento";

export const FALLBACK_COUPLE = "Flávio & Ana";
export const FALLBACK_DATE = "2026-08-15";
export const FALLBACK_SLUG = "flavio-ana-paula";
export const FALLBACK_TITLE = `${FALLBACK_COUPLE} | Casamento`;
export const FALLBACK_DESCRIPTION =
  "Convite digital do casamento de Flávio e Ana, no dia 15 de agosto de 2026.";

function getPublicSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  const value = configuredUrl || (vercelUrl ? `https://${vercelUrl}` : "");

  if (value) {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {
      // A mensagem abaixo informa a configuração inválida sem expor valores.
    }

    throw new Error(
      "NEXT_PUBLIC_SITE_URL deve ser uma URL completa iniciada por http:// ou https://.",
    );
  }

  return new URL("http://localhost:3000");
}

function formatLongDate(value: string | null | undefined) {
  const date = new Date(`${value || FALLBACK_DATE}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "15 de agosto de 2026";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getSafeImageUrl(value: string | null | undefined) {
  if (!value) return "/images/casal-principal.jpg";

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "/images/casal-principal.jpg";
  } catch {
    return value.startsWith("/") && !value.startsWith("//")
      ? value
      : "/images/casal-principal.jpg";
  }
}

export function createEventMetadata(
  evento?: Evento | null,
  configuracao?: ConfiguracaoEvento | null,
  slug = evento?.slug || FALLBACK_SLUG,
): Metadata {
  const couple = evento?.nome_casal?.trim() || FALLBACK_COUPLE;
  const title = `${couple} | Casamento`;
  const description = evento
    ? `Convite digital do casamento de ${couple.replace(/\s*&\s*/g, " e ")}, no dia ${formatLongDate(evento.data_evento)}.`
    : FALLBACK_DESCRIPTION;
  const canonical = `/evento/${encodeURIComponent(slug)}`;
  const image =
    configuracao?.hero_background_type === "image"
      ? getSafeImageUrl(configuracao.hero_background_url)
      : "/images/casal-principal.jpg";

  return {
    metadataBase: getPublicSiteUrl(),
    title: { absolute: title },
    description,
    applicationName: title,
    authors: [{ name: couple }],
    creator: couple,
    publisher: couple,
    keywords: [
      "casamento",
      "convite de casamento",
      "convite digital",
      couple,
      formatLongDate(evento?.data_evento),
    ],
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: canonical,
      siteName: title,
      title,
      description,
      images: [{ url: image, alt: `Convite de casamento de ${couple}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
