import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../../../services/eventos";
import { getConfiguracaoEvento } from "../../../../../services/configuracoes-evento";
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

  const [confirmacoes, configuracoes] = await Promise.all([
    getConfirmacoesByEventoId(evento.id),
    getConfiguracaoEvento(evento.id),
  ]);

  return (
    <div className="admin-page-stack">
      <ConfirmationsManager
        eventoId={evento.id}
        confirmacoes={confirmacoes}
        maxAcompanhantes={configuracoes?.max_acompanhantes ?? 4}
      />
    </div>
  );
}