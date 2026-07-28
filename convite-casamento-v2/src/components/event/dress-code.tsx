type DressCodeProps = {
  titulo: string | null;
  descricao: string | null;
  homens: string | null;
  mulheres: string | null;
  cores: string | null;
  observacao: string | null;
};

function buildList(text: string | null) {
  if (!text) return [];

  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function DressCode({
  titulo,
  descricao,
  homens,
  mulheres,
  cores,
  observacao,
}: DressCodeProps) {
  const tituloFinal = titulo || "Esporte fino";

  const descricaoFinal =
    descricao ||
    "Para este dia especial, sugerimos traje esporte fino. Queremos que todos estejam elegantes e confortáveis para celebrar conosco.";

  const homensLista = buildList(
    homens ||
      `Camisa social
Calça de sarja ou alfaiataria
Sapato social ou mocassim
Blazer opcional
Evitar bermuda, jeans e boné`,
  );

  const mulheresLista = buildList(
    mulheres ||
      `Vestido longo ou midi
Saia longa com blusa elegante
Sapatos com salto ou rasteira refinada
Evitar vestidos curtos, roupas muito justas e transparências excessivas`,
  );

  const coresFinal =
    cores ||
    "Pedimos com carinho que evitem tons muito próximos ao azul marinho e ao bordô, que fazem parte da identidade visual do nosso casamento.";

  const observacaoFinal =
    observacao ||
    "O mais importante é que você se sinta bem para celebrar esse momento conosco.";

  return (
    <section className="event-section event-section--dress-code">
      <div className="dress-code-refined">
        <div className="dress-code-refined__header">
          <span className="section-badge">Dress Code</span>
          <h2 className="section-title">{tituloFinal}</h2>
          <p className="section-description">{descricaoFinal}</p>
        </div>

        <div className="dress-code-refined__grid">
          <article className="dress-code-refined__card">
            <div className="dress-code-refined__icon" aria-hidden="true">
              🕴️
            </div>

            <h3 className="dress-code-refined__card-title">Homens</h3>

            {homensLista.length ? (
              <ul className="dress-code-refined__list">
                {homensLista.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="dress-code-refined__empty">
                Traje esporte fino com visual alinhado e elegante.
              </p>
            )}
          </article>

          <article className="dress-code-refined__card">
            <div className="dress-code-refined__icon" aria-hidden="true">
              👗
            </div>

            <h3 className="dress-code-refined__card-title">Mulheres</h3>

            {mulheresLista.length ? (
              <ul className="dress-code-refined__list">
                {mulheresLista.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="dress-code-refined__empty">
                Produção elegante, confortável e apropriada para a ocasião.
              </p>
            )}
          </article>
        </div>

        <article className="dress-code-refined__colors">
          <span className="dress-code-refined__colors-badge">
            Orientação de cores
          </span>

          <h3 className="dress-code-refined__colors-title">Cores reservadas</h3>

          <p className="dress-code-refined__colors-text">{coresFinal}</p>
        </article>

        {observacaoFinal ? (
          <div className="dress-code-refined__note">
            <p>{observacaoFinal}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}