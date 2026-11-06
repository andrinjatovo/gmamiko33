const encoder = new TextEncoder();

export function generateRecoveryCode() {
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= 4294000000);
  return String(values[0] % 1000000).padStart(6, "0");
}

export async function recoveryHash(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
  return Array.from(bytes, v => v.toString(16).padStart(2, "0")).join("");
}

async function cipherKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptRecoveryCode(secret: string, code: string, email: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(email) }, await cipherKey(secret), encoder.encode(code)));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...encrypted))}`;
}

export async function decryptRecoveryCode(secret: string, ciphertext: string, email: string) {
  const [ivPart, dataPart] = ciphertext.split(".");
  if (!ivPart || !dataPart) throw new Error("Kaody tsy mety.");
  const iv = Uint8Array.from(atob(ivPart), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(dataPart), c => c.charCodeAt(0));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: encoder.encode(email) }, await cipherKey(secret), data));
}