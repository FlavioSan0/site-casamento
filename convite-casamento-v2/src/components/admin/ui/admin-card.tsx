type AdminCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function AdminCard({ children, className = "" }: AdminCardProps) {
  return <div className={`admin-card ${className}`.trim()}>{children}</div>;
}

type AdminCardHeaderProps = {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
};

export function AdminCardHeader({
  title,
  description,
  rightSlot,
}: AdminCardHeaderProps) {
  return (
    <div className="admin-card-header">
      <div className="admin-card-header__content">
        <h3 className="admin-card-header__title">{title}</h3>
        {description ? (
          <p className="admin-card-header__description">{description}</p>
        ) : null}
      </div>

      {rightSlot ? <div>{rightSlot}</div> : null}
    </div>
  );
}