import { BadgeCheck } from "lucide-react";

export default function LicenseCard({ license }) {
  if (!license) return null;
  return (
    <div className="rounded-xl border border-line-soft bg-white p-5 shadow-card">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink"><BadgeCheck className="h-4 w-4 text-approved" /> Licença do projeto</h3>
      <p className="font-mono-num text-base font-bold tracking-wide text-ink">{license.code}</p>
      <dl className="mt-2 space-y-1 text-xs text-muted">
        <div><dt className="inline font-semibold text-ink">Tipo: </dt><dd className="inline">{license.type}</dd></div>
        <div><dt className="inline font-semibold text-ink">Titular: </dt><dd className="inline">{license.holder}</dd></div>
        <div><dt className="inline font-semibold text-ink">Emitida em: </dt><dd className="inline">{new Date(license.issuedAt).toLocaleDateString("pt-BR")}</dd></div>
      </dl>
      <p className="mt-2 rounded-md bg-cloud px-2.5 py-1.5 text-[11px] text-muted">Licença provisória e fictícia, gerada automaticamente na criação do projeto (protótipo).</p>
    </div>
  );
}
