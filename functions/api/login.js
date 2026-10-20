import { makeSession, sessionCookie, json } from "../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ error: "Configure ADMIN_PASSWORD et SESSION_SECRET dans les paramètres Cloudflare." }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: "Requête invalide." }, 400); }
  const supplied = typeof body.password === "string" ? body.password : "";
  const encoder = new TextEncoder();
  const a = await crypto.subtle.digest("SHA-256", encoder.encode(supplied));
  const b = await crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_PASSWORD));
  const aa = new Uint8Array(a), bb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  if (diff !== 0) return json({ error: "Mot de passe incorrect." }, 401);
  const token = await makeSession(env.SESSION_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}
