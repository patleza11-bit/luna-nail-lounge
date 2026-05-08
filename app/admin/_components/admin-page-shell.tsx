import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

type AdminPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-[#9f635d]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold leading-tight text-[#2f2824]">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#6f625b]">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function AdminPanel({
  title,
  description,
  children,
  className = "",
}: AdminPanelProps) {
  return (
    <section
      className={`rounded-lg border border-[#eadbd1] bg-white p-5 shadow-sm shadow-[#eadbd1]/35 sm:p-6 ${className}`}
    >
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-[#2f2824]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-[#6f625b]">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
