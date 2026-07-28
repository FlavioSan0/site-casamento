import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../../../services/eventos";
import { getConfiguracaoEvento } from "../../../../../services/configuracoes-evento";
import { EventSettingsForm } from "../../../../../components/admin/event-settings-form";

type AdminConfiguracoesPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminConfiguracoesPage({
  params,
}: AdminConfiguracoesPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const configuracoes = await getConfiguracaoEvento(evento.id);

  return (
    <div className="admin-page-stack">
      <EventSettingsForm evento={evento} configuracoes={configuracoes} />
    </div>
  );
}