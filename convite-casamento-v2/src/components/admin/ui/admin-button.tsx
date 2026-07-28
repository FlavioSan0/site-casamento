type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type AdminButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: AdminButtonVariant;
  disabled?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export function AdminButton({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
  onClick,
}: AdminButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`admin-btn admin-btn--${variant} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
