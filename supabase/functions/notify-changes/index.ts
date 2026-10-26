// Automatikus értesítés: összevonja a várakozó változásokat (új/módosított/elmaradó alkalmak, hírek),
// és egy értesítést küld minden feliratkozónak. Az adatbázis időzítője hívja 5 percenként.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

type Row = { id: number; kind: "new" | "changed" | "news" | "cancelled"; ref_id: string | null; title: string; detail: string };

function compose(rows: Row[]) {
  // Ugyanarra az alkalomra csak egy sor maradjon; az "új" erősebb a "változott"-nál.
  const byRef = new Map<string, Row>();
  for (const r of rows) {
    const key = (r.kind === "news" ? "news:" : "ev:") + (r.ref_id ?? r.id);
    const prev = byRef.get(key);
    // A legfrissebb címet és adatot tartjuk meg, de ha az alkalom ebben a körben új volt, az is marad.
    byRef.set(key, prev && prev.kind === "new" && r.kind !== "cancelled" ? { ...r, kind: "new" } : r);
  }
  const items = [...byRef.values()];
  if (items.length === 1) {
    const r = items[0];
    const prefix = { new: "Új alkalom: ", changed: "Változás: ", news: "Új hír: ", cancelled: "Elmarad: " }[r.kind];
    const body = r.kind === "cancelled"
      ? "Az alkalom elmarad" + (r.detail && r.detail !== "Az alkalom elmarad." ? " (" + r.detail + ")." : ".")
      : r.detail || "Nézd meg a KRISZ appban!";
    return { title: (prefix + r.title).slice(0, 80), body };
  }
  const allChanged = items.every((r) => r.kind === "changed");
  const title = allChanged ? `${items.length} alkalom frissült` : `${items.length} újdonság a KRISZ appban`;
  const body = items.slice(0, 4).map((r) => (r.kind === "cancelled" ? "Elmarad: " : "") + r.title).join(" · ") + (items.length > 4 ? " …" : "");
  return { title, body: body.slice(0, 200) };
}

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: secrets } = await admin.from("app_secrets").select("name, value")
    .in("name", ["CRON_SECRET", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]);
  const k = Object.fromEntries((secrets ?? []).map((r) => [r.name, r.value]));
  if (!k.CRON_SECRET || req.headers.get("x-cron-secret") !== k.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  // Lefoglalja a várakozó sorokat, hogy két futás ne küldje ki kétszer ugyanazt.
  const { data: rows, error } = await admin.from("notify_queue")
    .update({ sent_at: new Date().toISOString() }).is("sent_at", null)
    .select("id, kind, ref_id, title, detail").order("id");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!rows || !rows.length) return new Response(JSON.stringify({ sent: 0, items: 0 }));

  const msg = compose(rows as Row[]);
  // Előzmény az app Értesítések nézetéhez
  await admin.from("notifications").insert({ title: msg.title, body: msg.body, url: "./#alkalmak" });
  webpush.setVapidDetails("mailto:kriszpont@gmail.com", k.VAPID_PUBLIC_KEY, k.VAPID_PRIVATE_KEY);
  const { data: subs } = await admin.from("push_subscriptions").select("endpoint, subscription");
  const payload = JSON.stringify({ ...msg, url: "./#ertesitesek" });

  let sent = 0;
  const gone: string[] = [];
  const errors: string[] = [];
  await Promise.all((subs ?? []).map(async (s) => {
    try { await webpush.sendNotification(s.subscription, payload, { TTL: 60 * 60 * 24 }); sent++; }
    catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) gone.push(s.endpoint);
      else errors.push(String(code ?? (e as Error).message));
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("endpoint", gone);

  return new Response(JSON.stringify({ items: rows.length, title: msg.title, body: msg.body, sent, removed: gone.length, errors }),
    { headers: { "Content-Type": "application/json" } });
});
