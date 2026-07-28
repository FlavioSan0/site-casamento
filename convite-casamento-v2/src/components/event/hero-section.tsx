import Image from "next/image";

type HeroSectionProps = {
  nomeCasal: string;
  dataFormatada: string;
  horario: string;
  heroBackgroundType?: "none" | "image" | "video" | null;
  heroBackgroundUrl?: string | null;
  heroOverlayOpacity?: number | null;
};

function normalizeHeroType(
  type: HeroSectionProps["heroBackgroundType"],
): "none" | "image" | "video" {
  if (type === "image" || type === "video") return type;
  return "none";
}

export function HeroSection({
  nomeCasal,
  dataFormatada,
  horario,
  heroBackgroundType = "none",
  heroBackgroundUrl = null,
  heroOverlayOpacity = 45,
}: HeroSectionProps) {
  const normalizedHeroType = normalizeHeroType(heroBackgroundType);
  const mediaUrl = String(heroBackgroundUrl || "").trim();

  const hasMedia = normalizedHeroType !== "none" && mediaUrl.length > 0;

  const overlayOpacity = Math.max(
    0.18,
    Math.min((heroOverlayOpacity ?? 45) / 100, 0.85),
  );

  return (
    <section className={`hero-section ${hasMedia ? "hero-section--media" : ""}`}>
      {hasMedia ? (
        <div className="hero-media-wrap">
          {normalizedHeroType === "video" ? (
            <video
              key={mediaUrl}
              className="hero-media hero-media--video"
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Vídeo de fundo do evento"
            />
          ) : (
            <Image
              className="hero-media hero-media--image"
              src={mediaUrl}
              alt=""
              fill
              sizes="100vw"
              preload
            />
          )}

          <div
            className="hero-media-overlay"
            style={{
              background: `linear-gradient(
                180deg,
                rgba(0,0,0,${overlayOpacity * 0.3}) 0%,
                rgba(0,0,0,${overlayOpacity * 0.55}) 45%,
                rgba(0,0,0,${overlayOpacity}) 100%
              )`,
            }}
          />
        </div>
      ) : (
        <div className="hero-fallback-bg" />
      )}

      <div className="hero-inner">
        <div className="hero-content">
          <span className="section-badge hero-badge">Nosso grande dia</span>

          <h1 className="hero-title">{nomeCasal}</h1>

          <p className="hero-subtitle">
            Estamos muito felizes em compartilhar esse momento com você.
          </p>

          <div className="hero-meta">
            {dataFormatada ? <span>{dataFormatada}</span> : null}
            {horario ? <span>{horario}</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
