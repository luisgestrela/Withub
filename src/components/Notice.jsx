export default function Notice({ notice }) {
  if (!notice) return null;
  const ok = notice.type === "ok";
  return (
    <div role="status" className={`mb-4 rounded-lg border px-3 py-2 text-sm ${ok ? "border-approved/30 bg-approved-bg text-approved" : "border-red-200 bg-red-50 text-red-700"}`}>
      {notice.text}
    </div>
  );
}
