import logo from "../assets/logo.png";

export default function Logo({ withWordmark = true, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt="WitHub" className="h-7 w-7 shrink-0" />
      {withWordmark && (
        <span className="text-[17px] font-bold tracking-tight text-ink">
          Wit<span className="text-transparent bg-clip-text bg-brand-gradient">Hub</span>
        </span>
      )}
    </div>
  );
}