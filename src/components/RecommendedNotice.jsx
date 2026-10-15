import { ShieldCheck } from "lucide-react";

export default function RecommendedNotice() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-violet/20 bg-violet-50 p-3 sm:flex-row sm:items-center sm:gap-3">
      <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md bg-violet px-3 py-1.5 text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">
        <ShieldCheck className="h-5 w-5" />
        Recomendado
      </span>
      <p className="text-xs text-ink">Empresas tendem a visualizar melhor projetos que possuem esses detalhes técnicos.</p>
    </div>
  );
}
