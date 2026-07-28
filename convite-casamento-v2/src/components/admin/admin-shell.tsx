"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  ImageIcon,
  LayoutDashboard,
  Settings2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { buildThemeStyle, type ThemeConfig } from "../../lib/theme";
import styles from "./admin-shell.module.css";
import { AdminLogoutButton } from "./admin-logout-button";

type AdminShellProps = {
  children: React.ReactNode;
  eventoSlug: string;
  eventoNome: string;
  themeConfig?: ThemeConfig | null;
};

type NavItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AdminShell({
  children,
  eventoSlug,
  eventoNome,
  themeConfig,
}: AdminShellProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      title: "Visão geral",
      description: "Resumo do evento",
      href: `/admin/eventos/${eventoSlug}`,
      icon: LayoutDashboard,
    },
    {
      title: "Configurações",
      description: "Dados e ajustes gerais",
      href: `/admin/eventos/${eventoSlug}/configuracoes`,
      icon: Settings2,
    },
    {
      title: "Convidados",
      description: "Confirmações e presença",
      href: `/admin/eventos/${eventoSlug}/convidados`,
      icon: UsersRound,
    },
    {
      title: "Financeiro",
      description: "Presentes e reservas",
      href: `/admin/eventos/${eventoSlug}/financeiro`,
      icon: WalletCards,
    },
    {
      title: "Layout",
      description: "Galeria e visual",
      href: `/admin/eventos/${eventoSlug}/layout`,
      icon: ImageIcon,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/admin/eventos/${eventoSlug}`) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className={styles.shell} style={buildThemeStyle(themeConfig)}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarEyebrow}>Painel administrativo</span>
              <h1 className={styles.sidebarTitle}>Evento</h1>
              <p className={styles.sidebarDescription}>
                Organize o evento por seções e trabalhe com mais clareza no painel.
              </p>
            </div>

            <nav className={styles.nav}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  >
                    <div className={styles.navIconWrap}>
                      <Icon className={styles.navIcon} />
                    </div>

                    <div className={styles.navText}>
                      <span className={styles.navTitle}>{item.title}</span>
                      <span className={styles.navDescription}>
                        {item.description}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className={styles.sidebarFooter}>
            <Link
              href={`/evento/${eventoSlug}`}
              target="_blank"
              className={styles.publicLink}
            >
              <ExternalLink className={styles.publicLinkIcon} />
              <span>Abrir site público</span>
            </Link>
            <AdminLogoutButton eventoSlug={eventoSlug} />
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarContent}>
            <span className={styles.topbarEyebrow}>Gerenciando agora</span>
            <h2 className={styles.topbarTitle}>{eventoNome}</h2>
            <p className={styles.topbarSubtitle}>
              Painel principal do evento com módulos organizados para operação,
              acompanhamento e ajustes.
            </p>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}