type AdminFieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
};

export function AdminField({
  label,
  htmlFor,
  children,
  hint,
}: AdminFieldProps) {
  return (
    <div className="admin-field">
      <label className="admin-field__label" htmlFor={htmlFor}>
        {label}
      </label>

      <div className="admin-field__control">{children}</div>

      {hint ? <span className="admin-field__hint">{hint}</span> : null}
    </div>
  );
}