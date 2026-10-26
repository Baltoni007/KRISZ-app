// Értesítés küldése minden feliratkozott eszközre. Csak szerkesztő hívhatja.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

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
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!vapidPublic || !vapidPrivate) return json({ error: "Hiányzó VAPID kulcs" }, 500);

  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isEditor, error: roleErr } = await asUser.rpc("is_editor");
  if (roleErr || !isEditor) return json({ error: "Csak szerkesztő küldhet értesítést" }, 403);

  let payload: { title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Hibás kérés" }, 400);
  }
  const title = (payload.title ?? "").toString().slice(0, 80).trim();
  const body = (payload.body ?? "").toString().slice(0, 200).trim();
  if (!title) return json({ error: "Hiányzik a cím" }, 400);

  webpush.setVapidDetails("mailto:kriszpont@gmail.com", vapidPublic, vapidPrivate);
  const admin = createClient(url, service);
  const { data: subs, error } = await admin.from("push_subscriptions").select("endpoint, subscription");
  if (error) return json({ error: error.message }, 500);

  const message = JSON.stringify({ title, body, url: payload.url ?? "./" });
  let sent = 0;
  const gone: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(s.subscription, message, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);

  return json({ sent, removed: gone.length, total: subs?.length ?? 0 });
});
