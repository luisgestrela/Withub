const SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

export default function Avatar({ person, size = "md", className = "" }) {
  const dim = SIZES[size] || SIZES.md;
  if (person.photo) return <img src={person.photo} alt="" className={`${dim} shrink-0 rounded-full object-cover ${className}`} />;
  return (
    <span aria-hidden="true" className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-brand-gradient font-bold text-white ${className}`}>
      {person.initials}
    </span>
  );
}
