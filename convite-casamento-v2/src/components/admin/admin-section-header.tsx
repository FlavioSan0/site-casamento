import { AdminBadge } from "./ui/admin-badge";

type AdminSectionHeaderProps = {
  badge?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function AdminSectionHeader({
  badge = "Seção",
  title,
  description,
  actions,
}: AdminSectionHeaderProps) {
  return (
    <div className="admin-section-header">
      <div className="admin-section-header__content">
        <AdminBadge>{badge}</AdminBadge>
        <h1 className="admin-section-header__title">{title}</h1>
        {description ? (
          <p className="admin-section-header__description">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="admin-section-header__actions">{actions}</div> : null}
    </div>
  );
}