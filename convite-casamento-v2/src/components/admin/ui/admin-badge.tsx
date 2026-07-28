type AdminBadgeVariant = "default" | "success" | "warning" | "danger" | "neutral";

type AdminBadgeProps = {
  children: React.ReactNode;
  variant?: AdminBadgeVariant;
  className?: string;
};

export function AdminBadge({
  children,
  variant = "default",
  className = "",
}: AdminBadgeProps) {
  return (
    <span className={`admin-badge admin-badge--${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}