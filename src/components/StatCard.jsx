export default function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-line-soft bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1.5 font-mono-num text-2xl font-bold ${accent || "text-ink"}`}>{value}</p>
    </div>
  );
}
