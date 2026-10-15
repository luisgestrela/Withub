import { categories } from "../data/projects";

export default function CategoryChip({ id, size = "sm" }) {
  const cat = categories.find((c) => c.id === id);
  if (!cat) return null;
  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono-num font-medium ${sizeClasses}`}
      style={{ color: cat.color, borderColor: `${cat.color}33`, backgroundColor: `${cat.color}0D` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
      {cat.label}
    </span>
  );
}
