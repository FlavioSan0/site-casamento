import Link from "next/link";

type AdminTopbarProps = {
  slug: string;
  nomeEvento: string;
};

export function AdminTopbar({ slug, nomeEvento }: AdminTopbarProps) {
  return (
    <header className="admin-topbar">
      <div className="admin-topbar-info">
        <span className="admin-topbar-label">Gerenciando agora</span>
        <strong className="admin-topbar-title">{nomeEvento}</strong>
        <span className="admin-topbar-slug">Slug: {slug}</span>
      </div>

      <div className="admin-topbar-actions">
        <Link
          href={`/evento/${slug}`}
          target="_blank"
          className="secondary-button admin-topbar-button"
        >
          Ver site
        </Link>
      </div>
    </header>
  );
}