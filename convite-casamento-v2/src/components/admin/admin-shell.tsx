"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  HeartHandshake,
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
      description: "Confirmações e mensagens",
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

  const currentSection =
    navItems.find((item) => isActive(item.href))?.title || "Painel";

  return (
    <div
      className={`${styles.shell} admin-ux`}
      style={buildThemeStyle(themeConfig)}
    >
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarTop}>
            <div className={styles.sidebarHeader}>
              <div className={styles.brandMark} aria-hidden="true">
                <HeartHandshake className={styles.brandMarkIcon} />
              </div>

              <div className={styles.sidebarHeaderText}>
                <span className={styles.sidebarEyebrow}>Painel administrativo</span>
                <h1 className={styles.sidebarTitle}>Painel do casal</h1>
                <p className={styles.sidebarDescription}>
                  Gerencie convidados, presentes e o visual do convite em um só lugar.
                </p>
              </div>
            </div>

            <div className={styles.eventChip} title={eventoNome}>
              <span className={styles.eventChipDot} aria-hidden="true" />
              <span className={styles.eventChipText}>{eventoNome}</span>
            </div>

            <nav className={styles.nav} aria-label="Navegação do painel">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${styles.navItem} ${
                      active ? styles.navItemActive : ""
                    }`}
                  >
                    <div className={styles.navIconWrap} aria-hidden="true">
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
            <div className={styles.topbarInfo}>
              <span className={styles.topbarEyebrow}>{currentSection}</span>
              <h2 className={styles.topbarTitle}>{eventoNome}</h2>
              <p className={styles.topbarSubtitle}>
                Acompanhe o evento e faça ajustes com clareza, sem perder o contexto.
              </p>
            </div>

            <div className={styles.topbarActions}>
              <Link
                href={`/evento/${eventoSlug}`}
                target="_blank"
                className={styles.topbarPublicLink}
              >
                <ExternalLink className={styles.publicLinkIcon} />
                <span>Ver convite</span>
              </Link>

              <div className={styles.mobileLogout}>
                <AdminLogoutButton eventoSlug={eventoSlug} compact />
              </div>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
