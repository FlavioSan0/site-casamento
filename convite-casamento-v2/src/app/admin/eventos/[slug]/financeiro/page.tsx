import { notFound } from "next/navigation";
import { getEventoBySlug } from "../../../../../services/eventos";
import { getPresentesByEventoId } from "../../../../../services/presentes";
import { getReservasByEventoId } from "../../../../../services/reservas";
import { GiftsManager } from "../../../../../components/admin/gifts-manager";
import { ReservasTable } from "../../../../../components/admin/reservas-table";

type AdminFinanceiroPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminFinanceiroPage({
  params,
}: AdminFinanceiroPageProps) {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const [presentes, reservas] = await Promise.all([
    getPresentesByEventoId(evento.id),
    getReservasByEventoId(evento.id),
  ]);

  return (
    <div className="admin-page-stack">
      <GiftsManager eventoId={evento.id} presentes={presentes} />
      <ReservasTable eventoId={evento.id} reservas={reservas} />
    </div>
  );
}   