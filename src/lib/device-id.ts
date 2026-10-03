// Empreinte du téléphone : identifiant stocké + caractéristiques matérielles.
// Les caractéristiques matérielles restent identiques même si le stockage est vidé.
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getDeviceHash() {
  const n = navigator as Navigator & { deviceMemory?: number };
  const parts = [
    n.userAgent,
    n.platform,
    n.language,
    String(n.hardwareConcurrency ?? ""),
    String(n.deviceMemory ?? ""),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(window.devicePixelRatio),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(n.maxTouchPoints ?? 0),
  ];
  return sha256(parts.join("|"));
}
