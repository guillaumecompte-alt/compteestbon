import { json } from "../_lib/auth.js";

export async function onRequestGet({ env }) {
  return json({
    ok: true,
    functions: true,
    databaseConfigured: Boolean(env.DB),
    authenticationConfigured: Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET)
  });
}
