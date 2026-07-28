import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../services/eventos";
import { getConfiguracaoEvento } from "../../../services/configuracoes-evento";
import { getPresentesByEventoId } from "../../../services/presentes";
import { getGaleriaByEventoId } from "../../../services/galeria-evento";
import { getHistoriaMomentosByEventoId } from "../../../services/historia-momentos";
import { buildThemeStyle, getThemeConfig } from "../../../lib/theme";
import { HeroSection } from "../../../components/event/hero-section";
import { EventInfo } from "../../../components/event/event-info";
import { Countdown } from "../../../components/event/countdown";
import { RsvpForm } from "../../../components/event/rsvp-form";
import { GiftsSection } from "../../../components/event/gifts-section";
import { GallerySection } from "../../../components/event/gallery-section";
import { PixSection } from "../../../components/event/pix-section";
import { DressCode } from "../../../components/event/dress-code";
import { HistorySection } from "../../../components/event/history-section";
import { EventOpening } from "../../../components/event/event-opening";
import { Reveal } from "../../../components/event/reveal";
import { createEventMetadata } from "../../../lib/metadata";

type EventoPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: EventoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    return {
      title: { absolute: "Convite não encontrado" },
      robots: { index: false, follow: false },
    };
  }

  const configuracao = await getConfiguracaoEvento(evento.id);
  return createEventMetadata(evento, configuracao, slug);
}

function formatDateBR(dateString: string | null) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export default async function EventoPage({ params }: EventoPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const [configuracoes, presentes, galeria, historia] = await Promise.all([
    getConfiguracaoEvento(evento.id),
    getPresentesByEventoId(evento.id),
    getGaleriaByEventoId(evento.id),
    getHistoriaMomentosByEventoId(evento.id),
  ]);

  const theme = getThemeConfig(configuracoes);
  const dataFormatada = formatDateBR(evento.data_evento);
  const horario = evento.horario_evento || "";

  return (
    <main
      className={`event-page public-theme-scope public-theme-scope--${theme.modelo_layout}`}
      style={buildThemeStyle(configuracoes)}
    >
      <EventOpening
        key={slug}
        eventKey={slug}
        coupleNames={evento.nome_casal}
        eventDate={dataFormatada}
      >
        <HeroSection
          nomeCasal={evento.nome_casal}
          dataFormatada={dataFormatada}
          horario={horario}
          heroBackgroundType={configuracoes?.hero_background_type}
          heroBackgroundUrl={configuracoes?.hero_background_url}
          heroOverlayOpacity={configuracoes?.hero_overlay_opacity}
        />

        <div className="event-container">
        <div className="event-shell">
          <div className="countdown-floating countdown-floating--top">
            <Reveal>
              <Countdown
                dataEvento={evento.data_evento}
                horarioEvento={evento.horario_evento}
              />
            </Reveal>
          </div>

          <Reveal>
            <section className="event-section event-section--info">
              <EventInfo
                nomeEvento={evento.nome_evento}
                dataFormatada={dataFormatada}
                horario={horario}
                localCerimonia={evento.local_cerimonia}
                localRecepcao={evento.local_recepcao}
                linkMapsCerimonia={evento.link_maps_cerimonia}
                linkMapsRecepcao={evento.link_maps_recepcao}
              />
            </section>
          </Reveal>

          <Reveal>
            <HistorySection
              ativa={configuracoes?.historia_ativa ?? true}
              titulo={configuracoes?.historia_titulo || null}
              descricao={configuracoes?.historia_descricao || null}
              modelo={configuracoes?.historia_modelo_grid || null}
              momentos={historia}
            />
          </Reveal>

          <Reveal>
            <GallerySection imagens={galeria} />
          </Reveal>

          <Reveal>
            <DressCode
              titulo={configuracoes?.dress_code_titulo || null}
              descricao={configuracoes?.dress_code_descricao || null}
              homens={configuracoes?.dress_code_homens || null}
              mulheres={configuracoes?.dress_code_mulheres || null}
              cores={configuracoes?.dress_code_cores || null}
              observacao={configuracoes?.dress_code_observacao || null}
            />
          </Reveal>

          <Reveal>
            <RsvpForm
              eventoId={evento.id}
              dataLimiteConfirmacao={configuracoes?.data_limite_confirmacao || null}
              mensagemConfirmacao={configuracoes?.mensagem_confirmacao || null}
              maxAcompanhantes={configuracoes?.max_acompanhantes ?? 4}
            />
          </Reveal>

          <Reveal>
            <GiftsSection eventoId={evento.id} presentes={presentes} />
          </Reveal>

          <Reveal>
            <PixSection
              chavePix={configuracoes?.chave_pix || null}
              qrPixUrl={configuracoes?.qr_pix_url || null}
            />
          </Reveal>

          <Reveal>
            <footer className="event-public-footer">
              <div className="event-public-footer__content">
                <p>
                  Com carinho, obrigado por fazer parte da nossa história.
                </p>

                <Link
                  href={`/admin/login?evento=${slug}`}
                  className="event-public-footer__admin-link"
                >
                  Área dos noivos
                </Link>
              </div>
            </footer>
          </Reveal>
        </div>
        </div>
      </EventOpening>
    </main>
  );
}
