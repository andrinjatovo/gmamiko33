import { useLang } from "@/hooks/use-lang";

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="inline-flex shrink-0 rounded-full border border-border bg-card p-0.5 text-[11px] font-semibold" role="group" aria-label="Langue">
      {(["mg", "fr"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`pressable rounded-full px-2.5 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {l === "mg" ? "MG" : "FR"}
        </button>
      ))}
    </div>
  );
}
