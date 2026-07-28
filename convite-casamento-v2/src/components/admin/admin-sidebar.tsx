"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminSidebarProps = {
  slug: string;
};

const items = [
  {
    label: "Visão geral",
    href: "",
    description: "Resumo do evento",
  },
  {
    label: "Configurações",
    href: "/configuracoes",
    description: "Dados e ajustes gerais",
  },
  {
    label: "Convidados",
    href: "/convidados",
    description: "Confirmações e presença",
  },
  {
    label: "Financeiro",
    href: "/financeiro",
    description: "Presentes e reservas",
  },
  {
    label: "Layout",
    href: "/layout",
    description: "Galeria e visual",
  },
];

export function AdminSidebar({ slug }: AdminSidebarProps) {
  const pathname = usePathname();
  const base = `/admin/eventos/${slug}`;

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-kicker">Painel administrativo</span>
        <strong className="admin-sidebar-title">Evento</strong>
        <p className="admin-sidebar-text">
          Organize o evento por seções e trabalhe com mais clareza no painel.
        </p>
      </div>

      <nav className="admin-sidebar-nav">
        {items.map((item) => {
          const href = `${base}${item.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.label}
              href={href}
              className={`admin-sidebar-link ${
                isActive ? "admin-sidebar-link--active" : ""
              }`}
            >
              <div className="admin-sidebar-link-content">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <Link
          href={`/evento/${slug}`}
          target="_blank"
          className="secondary-button admin-sidebar-footer-button"
        >
          Abrir site público
        </Link>
      </div>
    </aside>
  );
}