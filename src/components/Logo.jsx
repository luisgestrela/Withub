import logo from "../assets/logo.png";

export default function Logo({ withWordmark = true, mark = true, light = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {mark && <img src={logo} alt="WitHub" className="h-7 w-7 shrink-0" />}
      {withWordmark && (
        <span className={`text-[17px] font-bold tracking-tight ${light ? "text-white" : "text-ink"}`}>
          Wit<span className={light ? "text-white" : "text-[#003C5F]"}>Hub</span>
        </span>
      )}
    </div>
  );
}
