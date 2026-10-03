// Identifiant unique du téléphone, conservé dans le stockage local ET un cookie longue durée
// (si l'un est effacé, l'autre le restaure).
const KEY = "gm_device_id";

function readCookie() {
  const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([a-f0-9]+)`));
  return m?.[1] ?? null;
}

export function getDeviceHash() {
  let id = localStorage.getItem(KEY) || readCookie();
  if (!id || !/^[a-f0-9]{32,}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  localStorage.setItem(KEY, id);
  document.cookie = `${KEY}=${id}; max-age=${60 * 60 * 24 * 365 * 5}; path=/; SameSite=Lax`;
  return id;
}
