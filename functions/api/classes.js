import { json, requireAuth } from "../_lib/auth.js";

export async function onRequest({ request, env }) {
  const denied = await requireAuth(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: "La liaison D1 nommée DB n'est pas configurée." }, 503);

  if (request.method === "GET") {
    const result = await env.DB.prepare(
      "SELECT c.id, c.name, c.created_at, COUNT(p.level_id) AS completed_count FROM classes c LEFT JOIN progress p ON p.class_id = c.id GROUP BY c.id ORDER BY c.created_at, c.name"
    ).all();
    return json({ classes: result.results || [] });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Requête invalide." }, 400); }
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!id || id.length > 100 || !name || name.length > 60) {
      return json({ error: "Un identifiant et un nom de classe (1 à 60 caractères) sont requis." }, 400);
    }
    try {
      await env.DB.prepare("INSERT INTO classes (id, name) VALUES (?, ?)").bind(id, name).run();
      return json({ id, name }, 201);
    } catch (error) {
      return json({ error: "Impossible de créer cette classe. Vérifie que son identifiant n'existe pas déjà." }, 409);
    }
  }

  return json({ error: "Méthode non autorisée." }, 405, { Allow: "GET, POST" });
}
