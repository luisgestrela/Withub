export const fieldClass = "block w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-3 text-sm text-ink placeholder-muted focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue";
export const plainFieldClass = "block w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink placeholder-muted focus:border-blue focus:outline-none focus:ring-1 focus:ring-blue";

export function Field({ id, label, icon: Icon, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <div className="relative mt-1">
        {Icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="h-4 w-4 text-muted" /></div>}
        {children}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}