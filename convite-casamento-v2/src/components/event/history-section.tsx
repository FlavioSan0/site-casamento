import Image from "next/image";
import type { HistoriaMomento } from "../../services/historia-momentos";

type HistorySectionProps = {
  ativa: boolean;
  titulo: string | null;
  descricao: string | null;
  modelo: "editorial" | "mosaico" | "timeline" | null;
  momentos: HistoriaMomento[];
};

function normalizeModel(
  value: HistorySectionProps["modelo"],
): "editorial" | "mosaico" | "timeline" {
  if (value === "mosaico" || value === "timeline") return value;
  return "editorial";
}

function sortMoments(momentos: HistoriaMomento[]) {
  return [...momentos].sort((a, b) => {
    const orderDiff = Number(a.ordem ?? 0) - Number(b.ordem ?? 0);
    if (orderDiff !== 0) return orderDiff;

    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return aTime - bTime;
  });
}

function MomentCopy({ momento }: { momento: HistoriaMomento }) {
  if (!momento.titulo && !momento.descricao) return null;

  return (
    <div className="history-moment__copy">
      {momento.titulo ? (
        <h3 className="history-moment__title">{momento.titulo}</h3>
      ) : null}
      {momento.descricao ? (
        <p className="history-moment__description">{momento.descricao}</p>
      ) : null}
    </div>
  );
}

export function HistorySection({
  ativa,
  titulo,
  descricao,
  modelo,
  momentos,
}: HistorySectionProps) {
  if (!ativa || !momentos.length) return null;

  const normalizedModel = normalizeModel(modelo);
  const orderedMoments = sortMoments(momentos);

  if (normalizedModel === "editorial") {
    const featuredIndex = orderedMoments.findIndex((item) => item.destaque);
    const featured =
      featuredIndex >= 0 ? orderedMoments[featuredIndex] : orderedMoments[0];
    const secondary = orderedMoments.filter(
      (item) => Number(item.id) !== Number(featured.id),
    );

    return (
      <section className="event-section history-section history-section--editorial">
        <div className="section-header">
          <span className="section-badge">Nossa história</span>
          <h2 className="section-title">{titulo || "Nossa história"}</h2>
          <p className="section-description">
            {descricao ||
              "Alguns momentos especiais que fazem parte da nossa caminhada até este grande dia."}
          </p>
        </div>

        <div className="history-editorial-grid">
          <article className="history-editorial-featured">
            <div className="history-moment__image-wrap history-moment__image-wrap--featured">
              <Image
                src={featured.imagem_url}
                alt={featured.titulo || "Momento especial do casal"}
                fill
                sizes="(max-width: 900px) 100vw, 60vw"
                className="history-moment__image"
              />
            </div>
            <MomentCopy momento={featured} />
          </article>

          {secondary.length ? (
            <div className="history-editorial-side">
              {secondary.map((momento) => (
                <article key={momento.id} className="history-editorial-card">
                  <div className="history-moment__image-wrap">
                    <Image
                      src={momento.imagem_url}
                      alt={momento.titulo || "Momento da história do casal"}
                      fill
                      sizes="(max-width: 900px) 100vw, 36vw"
                      className="history-moment__image"
                    />
                  </div>
                  <MomentCopy momento={momento} />
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className={`event-section history-section history-section--${normalizedModel}`}
    >
      <div className="section-header">
        <span className="section-badge">Nossa história</span>
        <h2 className="section-title">{titulo || "Nossa história"}</h2>
        <p className="section-description">
          {descricao ||
            "Alguns momentos especiais que fazem parte da nossa caminhada até este grande dia."}
        </p>
      </div>

      <div className={`history-${normalizedModel}-grid`}>
        {orderedMoments.map((momento, index) => (
          <article
            key={momento.id}
            className={`history-${normalizedModel}-card ${
              momento.destaque ? `history-${normalizedModel}-card--featured` : ""
            }`}
          >
            {normalizedModel === "timeline" ? (
              <div className="history-timeline-marker" aria-hidden="true">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
            ) : null}

            <div className="history-moment__image-wrap">
              <Image
                src={momento.imagem_url}
                alt={momento.titulo || `Momento ${index + 1} da história do casal`}
                fill
                sizes="(max-width: 900px) 100vw, 45vw"
                className="history-moment__image"
              />
            </div>

            <MomentCopy momento={momento} />
          </article>
        ))}
      </div>
    </section>
  );
}
