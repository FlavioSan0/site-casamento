import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getEventoBySlug } from "../../../../services/eventos";
import { getConfiguracaoEvento } from "../../../../services/configuracoes-evento";
import { AdminShell } from "../../../../components/admin/admin-shell";
import { getAuthenticatedUser } from "../../../../lib/supabase/auth";
import { FALLBACK_COUPLE } from "../../../../lib/metadata";

type AdminEventoLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: Pick<AdminEventoLayoutProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const evento = await getEventoBySlug(slug);
  const couple = evento?.nome_casal?.trim() || FALLBACK_COUPLE;

  return {
    title: {
      default: `Painel | ${couple}`,
      template: `%s | ${couple}`,
    },
    robots: { index: false, follow: false },
  };
}

export default async function AdminEventoLayout({
  children,
  params,
}: AdminEventoLayoutProps) {
  const { slug } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/admin/login?evento=${encodeURIComponent(slug)}&redirect=${encodeURIComponent(`/admin/eventos/${slug}`)}`);
  }

  const evento = await getEventoBySlug(slug);

  if (!evento) {
    notFound();
  }

  const configuracoes = await getConfiguracaoEvento(evento.id);

  return (
    <AdminShell
      eventoSlug={evento.slug}
      eventoNome={evento.nome_casal || "Evento"}
      themeConfig={configuracoes}
    >
      {children}
    </AdminShell>
  );
}
