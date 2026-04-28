export function PageHeader({ title, description, actions }) {
  return (
    <header className="admin-page-head">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </header>
  );
}
