// Üzenet mentése az appból (Szerkesztő fül). Csak szerkesztő hívhatja; az értesítést az adatbázis indítja.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST kell" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isEditor, error: roleErr } = await asUser.rpc("is_editor");
  if (roleErr || !isEditor) return json({ error: "Csak szerkesztő küldhet üzenetet" }, 403);

  let payload: { title?: string; body?: string; sender?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Hibás kérés" }, 400);
  }
  const title = (payload.title ?? "").toString().slice(0, 80).trim();
  const body = (payload.body ?? "").toString().slice(0, 500).trim();
  const sender = (payload.sender ?? "KRISZ vezetőség").toString().slice(0, 40).trim() || "KRISZ vezetőség";
  if (!title) return json({ error: "Hiányzik a cím" }, 400);
  const { data: who } = await asUser.auth.getUser();

  const admin = createClient(url, service);
  // Csak elmentjük; a telefonos értesítést az adatbázis indítja (push-message), így bárhonnan küldött üzenet ugyanúgy megy ki.
  const { error: insErr } = await admin.from("messages").insert({ sender, title, body, created_by: who?.user?.email ?? null });
  if (insErr) return json({ error: insErr.message }, 500);
  const { count } = await admin.from("push_subscriptions").select("endpoint", { count: "exact", head: true });
  return json({ ok: true, total: count ?? 0 });
});
