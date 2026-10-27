// Egy új üzenet (messages tábla) kiküldése telefonos értesítésként.
// Az adatbázis hívja minden új üzenet beszúrásakor (x-cron-secret fejléccel), bárhonnan érkezik az üzenet.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: secrets } = await admin.from("app_secrets").select("name, value")
    .in("name", ["CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]);
  const k = Object.fromEntries((secrets ?? []).map((r) => [r.name, r.value]));
  if (!k.CRON_SECRET || req.headers.get("x-cron-secret") !== k.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  let id = 0;
  try { id = Number((await req.json()).id); } catch { /* üres */ }
  const { data: m } = await admin.from("messages").select("sender, title, body").eq("id", id).maybeSingle();
  if (!m) return new Response(JSON.stringify({ error: "nincs ilyen üzenet" }), { status: 404 });

  webpush.setVapidDetails("mailto:kriszpont@gmail.com", k.VAPID_PUBLIC_KEY, k.VAPID_PRIVATE_KEY);
  const payload = JSON.stringify({
    title: "Üzenet – " + m.sender,
    body: m.body ? m.title + "\n" + m.body : m.title,
    url: "./#uzenetek",
  });
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, subscription");
  let sent = 0;
  const gone: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    try { await webpush.sendNotification(s.subscription, payload, { TTL: 60 * 60 * 24 }); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);
  return new Response(JSON.stringify({ id, sent, removed: gone.length }), { headers: { "Content-Type": "application/json" } });
});
