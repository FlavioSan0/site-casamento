import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../../../services/eventos";
import { getConfiguracaoEvento } from "../../../../../services/configuracoes-evento";
import { getReservasByEventoId } from "../../../../../services/reservas";
import { createClient } from "../../../../../lib/supabase/server";
import { ConfirmationsManager } from "../../../../../components/admin/confirmations-manager";

async function getConfirmacoesByEventoId(eventoId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("confirmacoes")
    .select("*")
    .eq("evento_id", eventoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar confirmações:", error.message);
    return [];
  }

  return data || [];
}

type AdminConvidadosPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminConvidadosPage({
  params,
}: AdminConvidadosPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const [confirmacoes, configuracoes, reservas] = await Promise.all([
    getConfirmacoesByEventoId(evento.id),
    getConfiguracaoEvento(evento.id),
    getReservasByEventoId(evento.id),
  ]);

  return (
    <div className="admin-page-stack">
      <ConfirmationsManager
        eventoId={evento.id}
        confirmacoes={confirmacoes}
        reservas={reservas}
        evento={{
          slug: evento.slug,
          nome_casal: evento.nome_casal,
          data_evento: evento.data_evento,
          horario_evento: evento.horario_evento,
          local_cerimonia: evento.local_cerimonia,
          link_maps_cerimonia: evento.link_maps_cerimonia,
          local_recepcao: evento.local_recepcao,
          link_maps_recepcao: evento.link_maps_recepcao,
          chave_pix: configuracoes?.chave_pix || null,
        }}
        maxAcompanhantes={configuracoes?.max_acompanhantes ?? 4}
      />
    </div>
  );
}
