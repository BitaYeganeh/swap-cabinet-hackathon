import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[22px] border-[1.5px] border-dashed border-line px-6 py-[72px] text-center">
      <div className="mb-1.5 grid size-[72px] place-items-center rounded-full bg-surface-2 text-ink-2 [&>svg]:size-8">
        {icon}
      </div>
      <h3 className="font-display text-2xl font-medium">{title}</h3>
      {children && <p className="mb-2.5 max-w-[380px] text-ink-2">{children}</p>}
      {action}
    </div>
  );
}
