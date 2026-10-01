import { type ReactNode } from 'react';

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  style,
  className,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const cls =
    variant === 'danger'
      ? 'btn-danger'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'ghost'
          ? 'btn-ghost'
          : 'btn-primary';
  return (
    <button
      className={`btn ${cls} ${className || ''}`.trim()}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  name = '',
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  style,
  className,
}: {
  label?: string;
  name?: string;
  type?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <label className="field" style={style}>
      {label ? <span className="field-label">{label}</span> : null}
      <input
        className={`input ${className || ''}`.trim()}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label?: string;
  name: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <textarea
        className="input"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

export function Select({
  label,
  name = '',
  value,
  onChange,
  options,
  style,
  className,
}: {
  label?: string;
  name?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <label className="field" style={style}>
      {label ? <span className="field-label">{label}</span> : null}
      <select className={`input ${className || ''}`.trim()} name={name} value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Card({
  title,
  children,
  action,
  style,
  className,
}: {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <section className={`card ${className ?? ''}`} style={style}>
      {title || action ? (
        <header className="card-header">
          {title ? (typeof title === 'string' ? <h2 className="card-title">{title}</h2> : title) : null}
          {action}
        </header>
      ) : null}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  actions,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle || description ? <p className="page-subtitle">{subtitle || description}</p> : null}
      </div>
      {action || actions}
    </div>
  );
}

export function Badge({
  children,
  variant,
  style,
}: {
  children: ReactNode;
  variant?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`badge ${variant ? `badge-${variant}` : ''}`} style={style}>
      {children}
    </span>
  );
}

export function Spinner({ size }: { size?: number } = {}) {
  return <div className="spinner" aria-label="Loading" style={size ? { width: size, height: size } : undefined} />;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="error-state">Error: {message}</div>;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  data,
  keyOf,
  keyExtractor,
}: {
  columns: { key: string; label?: string; header?: string; render?: (row: T) => ReactNode }[];
  rows?: T[];
  data?: T[];
  keyOf?: (row: T) => string;
  keyExtractor?: (row: T) => string;
}) {
  const list = data || rows || [];
  if (list.length === 0) return <EmptyState message="No records found." />;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label || c.header || c.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <tr key={keyExtractor ? keyExtractor(row) : keyOf ? keyOf(row) : row.id}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      <span>
        Page {page} of {totalPages}
      </span>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}
