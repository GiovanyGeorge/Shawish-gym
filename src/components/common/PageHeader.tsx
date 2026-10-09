type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-sm text-shawish-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
