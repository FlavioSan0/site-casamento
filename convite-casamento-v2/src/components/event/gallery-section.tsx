type GalleryImage = {
  id: number;
  imagem_url: string;
  destaque?: boolean | null;
  ordem?: number | null;
};

type GallerySectionProps = {
  imagens: GalleryImage[];
};

export function GallerySection({ imagens }: GallerySectionProps) {
  if (!imagens || imagens.length === 0) {
    return null;
  }

  const imagensOrdenadas = [...imagens].sort((a, b) => {
    const destaqueA = a.destaque ? 1 : 0;
    const destaqueB = b.destaque ? 1 : 0;

    if (destaqueA !== destaqueB) {
      return destaqueB - destaqueA;
    }

    return (a.ordem ?? 9999) - (b.ordem ?? 9999);
  });

  const imagemPrincipal = imagensOrdenadas[0];
  const imagensSecundarias = imagensOrdenadas.slice(1, 5);

  return (
    <section className="event-section gallery-section">
      <div className="section-header">
        <span className="section-badge">Galeria</span>
        <h2 className="section-title">Momentos do nosso ensaio</h2>
        <p className="section-description">
          Registros especiais do nosso pré-wedding e da preparação para esse grande dia.
        </p>
      </div>

      <div
        className={`gallery-grid-refined ${
          imagensSecundarias.length === 0
            ? "gallery-grid-refined--single"
            : ""
        }`}
      >
        <article className="gallery-card gallery-card--featured">
          <img
            src={imagemPrincipal.imagem_url}
            alt="Imagem em destaque do casal"
            className="gallery-card__image"
          />
        </article>

        {imagensSecundarias.length > 0 ? (
          <div className="gallery-side-grid">
            {imagensSecundarias.map((imagem, index) => (
              <article key={imagem.id ?? index} className="gallery-card">
                <img
                  src={imagem.imagem_url}
                  alt={`Foto da galeria ${index + 2}`}
                  className="gallery-card__image"
                />
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}