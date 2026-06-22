import clsx from "clsx";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-xl2 border border-zinc-100 bg-white p-6 shadow-soft", className)}>{children}</div>;
}
