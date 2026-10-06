import { useSyncExternalStore } from "react";

export type Lang = "mg" | "fr";
const KEY = "gm_lang";
const listeners = new Set<() => void>();

function read(): Lang {
  if (typeof window === "undefined") return "mg";
  return localStorage.getItem(KEY) === "fr" ? "fr" : "mg";
}

export function setLang(l: Lang) {
  localStorage.setItem(KEY, l);
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}

/** Langue de l'interface (malgache par défaut), partagée par toute l'application. */
export function useLang() {
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "mg" as Lang,
  );
  const t = (mg: string, fr: string) => (lang === "fr" ? fr : mg);
  return { lang, setLang, t };
}
