const GOOGLE_MAPS_DIRECTIONS_BASE =
  "https://www.google.com/maps/dir/?api=1&destination=";

const ALLOWED_MAP_HOSTS = [
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
  "waze.com",
];

function cleanValue(value: string | null | undefined) {
  return String(value || "").trim();
}

function hasAllowedMapHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");

  if (/^(?:[a-z0-9-]+\.)*google\.[a-z.]+$/.test(normalizedHost)) {
    return true;
  }

  return ALLOWED_MAP_HOSTS.some(
    (allowedHost) =>
      normalizedHost === allowedHost ||
      normalizedHost.endsWith(`.${allowedHost}`),
  );
}

function buildSearchUrl(query: string) {
  const normalizedQuery = cleanValue(query);
  if (!normalizedQuery) return null;

  return `${GOOGLE_MAPS_DIRECTIONS_BASE}${encodeURIComponent(normalizedQuery)}`;
}

function looksLikeHostname(value: string) {
  return /^(?:www\.)?(?:maps\.app\.goo\.gl|maps\.google\.com|google\.[a-z.]+|goo\.gl|waze\.com)\//i.test(
    value,
  );
}

function normalizeHttpUrl(value: string) {
  const withProtocol = looksLikeHostname(value) ? `https://${value}` : value;

  try {
    const parsed = new URL(withProtocol);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (!hasAllowedMapHost(parsed.hostname)) {
      return null;
    }

    parsed.protocol = "https:";

    return parsed.toString();
  } catch {
    return null;
  }
}

function isGenericMapsHome(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    const hasUsefulQuery =
      parsed.searchParams.has("q") ||
      parsed.searchParams.has("query") ||
      parsed.searchParams.has("destination") ||
      parsed.searchParams.has("daddr") ||
      parsed.searchParams.has("api");

    return (
      !hasUsefulQuery &&
      (path === "" || path === "/maps" || path === "/maps/search")
    );
  } catch {
    return false;
  }
}

/**
 * Gera um destino seguro e funcional para Google Maps/Waze.
 *
 * Regras:
 * - mantém links completos de Google Maps, links curtos e Waze;
 * - converte links sem protocolo para HTTPS;
 * - converte endereço/consulta digitada no campo de link em rota do Google Maps;
 * - quando o link está vazio ou aponta apenas para a página inicial do Maps,
 *   usa o texto do local como consulta;
 * - bloqueia protocolos e hosts externos não relacionados a mapas.
 */
export function buildMapsUrl(
  mapsLink: string | null | undefined,
  locationText?: string | null,
) {
  const link = cleanValue(mapsLink);
  const location = cleanValue(locationText);

  if (link) {
    if (/^geo:/i.test(link)) {
      const [, queryString = ""] = link.split("?");
      const geoParams = new URLSearchParams(queryString);
      const geoQuery = geoParams.get("q") || link.replace(/^geo:/i, "").split("?")[0];
      return buildSearchUrl(geoQuery || location);
    }

    const normalizedUrl = normalizeHttpUrl(link);

    if (normalizedUrl && !isGenericMapsHome(normalizedUrl)) {
      return normalizedUrl;
    }

    if (!normalizedUrl && !/^[a-z][a-z\d+.-]*:/i.test(link)) {
      return buildSearchUrl(link);
    }
  }

  return buildSearchUrl(location);
}

export function normalizeMapsLinkForStorage(
  mapsLink: string | null | undefined,
  locationText?: string | null,
) {
  return buildMapsUrl(mapsLink, locationText);
}
