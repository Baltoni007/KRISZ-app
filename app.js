(function () {
  "use strict";

  var CFG = window.KRISZ_CONFIG || {};
  var sb = null;
  if (CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { persistSession: true, detectSessionInUrl: true, flowType: "implicit" }
    });
  }

  var ORGS = { "KRISZ": "krisz", "Tiszahát KA": "tiszahat", "TiBorKa": "tiborka", "Beregi KA": "beregi", "Mérce KA": "merce", "Tóháti KA": "tohat", "Ungi KA": "ung" };
  var MON = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];
  var MONF = ["Január", "Február", "Március", "Április", "Május", "Június", "Július", "Augusztus", "Szeptember", "Október", "November", "December"];
  var WD = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
  var JOIN = "https://docs.google.com/forms/d/e/1FAIpQLSclA2RhXwaBG1devkXjagt2tkEIuiBjUSBODRzghQhLW29TBg/viewform";

  var state = { events: [], news: [], updated: null, offline: false, filter: "all", showPast: false,
                editor: false, email: null, suggestions: [], sources: [], loginSent: false, pushMsg: "" };
  var today = new Date(); today.setHours(0, 0, 0, 0);

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dt(s) { if (!s) return null; var p = String(s).slice(0, 10).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function orgColor(o) { return "var(--" + (ORGS[o] || "krisz") + ")"; }
  function endOf(e) { return dt(e.end_date || e.start_date); }
  function dateLabel(e) {
    var a = dt(e.start_date); if (!a) return "Időpont hamarosan";
    var t = a.getFullYear() + ". " + MON[a.getMonth()] + " " + a.getDate() + ".";
    if (e.end_date) { var b = dt(e.end_date); t += " – " + (b.getMonth() !== a.getMonth() ? MON[b.getMonth()] + " " : "") + b.getDate() + "."; }
    return t + " (" + WD[a.getDay()] + ")";
  }
  function daysTo(d) { return Math.round((d - today) / 864e5); }
  function fmtStamp(iso) {
    if (!iso) return "";
    var d = new Date(iso); function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  /* ---------- data ---------- */
  function fetchData() {
    var remote = sb ? Promise.all([
      sb.from("events").select("*").order("start_date", { ascending: true, nullsFirst: false }),
      sb.from("news").select("*").order("published_on", { ascending: false }).limit(20)
    ]).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      var upd = r[0].data.reduce(function (m, e) { return e.updated_at > m ? e.updated_at : m; }, "");
      return { events: r[0].data, news: r[1].data, updated: upd || new Date().toISOString() };
    }) : Promise.reject(new Error("no-backend"));

    return remote.then(function (d) {
      state.offline = false; store("krisz-data", d); return d;
    }).catch(function () {
      var cached = load("krisz-data");
      if (cached && sb) { state.offline = !navigator.onLine; return cached; }
      return fetch("data.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).catch(function () { return cached || { events: [], news: [], updated: null }; });
    }).then(function (d) {
      state.events = d.events || []; state.news = d.news || []; state.updated = d.updated;
      renderAlkalmak(); renderHirek();
      $("offline").hidden = !state.offline;
    });
  }

  /* ---------- views ---------- */
  function sorted() {
    return state.events.slice().sort(function (a, b) {
      if (!a.start_date) return 1; if (!b.start_date) return -1;
      return a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0;
    });
  }

  function renderAlkalmak() {
    var evs = sorted();
    var next = evs.filter(function (e) { return e.start_date && endOf(e) >= today; })[0];
    var h = "";
    if (next) {
      var d = dt(next.start_date), n = daysTo(d);
      h += '<article class="feature"><div class="bigdate"><div class="d">' + d.getDate() + '</div><div class="m">' + MON[d.getMonth()] + '</div><div class="w">' + WD[d.getDay()] + '</div></div><div>' +
        '<div class="eyebrow">Következő alkalom</div><h1>' + esc(next.title) + '</h1><p>' + esc((next.orgs || []).join(" · ")) + (next.place ? " · " + esc(next.place) : "") + '</p>' +
        '<div class="count">' + (n <= 0 ? "Ma!" : n === 1 ? "Holnap" : n + " nap múlva") + '</div><div class="btnrow">' +
        (next.url ? '<a class="btn light" href="' + esc(next.url) + '" target="_blank" rel="noopener">Részletek</a>' : "") +
        '<button class="btn ghost" data-share="' + esc(next.id) + '">Megosztás</button></div></div></article>';
    }
    h += '<h2 class="sec">Alkalmaink</h2><div class="chips" role="group" aria-label="Szervező szerint">';
    h += '<button class="chip" data-f="all" aria-pressed="' + (state.filter === "all") + '">Mind</button>';
    Object.keys(ORGS).forEach(function (o) {
      h += '<button class="chip" data-f="' + esc(o) + '" aria-pressed="' + (state.filter === o) + '" style="--c:' + orgColor(o) + '"><span class="dot"></span>' + esc(o) + "</button>";
    });
    h += "</div>";
    var list = evs.filter(function (e) { return state.filter === "all" || (e.orgs || []).indexOf(state.filter) > -1; });
    var vis = list.filter(function (e) { return !e.start_date || endOf(e) >= today || state.showPast; });
    if (!vis.length) h += '<p class="empty">' + (state.events.length ? "Ennél a szervezőnél most nincs közelgő alkalom." : "Még nincsenek alkalmak feltöltve.") + "</p>";
    var lastM = null;
    vis.forEach(function (e) {
      var d = dt(e.start_date), key = d ? d.getFullYear() + "-" + d.getMonth() : "tbd";
      if (key !== lastM) { h += '<div class="month">' + (d ? MONF[d.getMonth()] + (d.getFullYear() !== today.getFullYear() ? " " + d.getFullYear() : "") : "Időpont egyeztetés alatt") + "</div>"; lastM = key; }
      var past = d && endOf(e) < today;
      h += '<article class="ev' + (past ? " past" : "") + '" id="e-' + esc(e.id) + '"><div class="date">' +
        (d ? '<div class="d">' + d.getDate() + (e.end_date ? '<span style="font-size:15px">–' + dt(e.end_date).getDate() + "</span>" : "") + '</div><div class="m">' + MON[d.getMonth()] + "</div>" : '<div class="tbd">hamarosan</div>') +
        '</div><div class="body"><h3>' + esc(e.title) + '</h3><div class="meta">' +
        (e.orgs || []).map(function (o) { return '<span class="org" style="--c:' + orgColor(o) + '">' + esc(o) + "</span>"; }).join("") +
        "<span>" + (e.place ? esc(e.place) : "Helyszín hamarosan") + '</span></div><div class="meta">' + esc(dateLabel(e)) + "</div>" +
        (e.description ? "<details><summary>Mi lesz ott?</summary><p>" + esc(e.description) + "</p>" + (e.url ? '<a class="more" href="' + esc(e.url) + '" target="_blank" rel="noopener">Bővebben a krisz.org-on →</a>' : "") + "</details>" : "") +
        '<div class="tags">' + (e.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + "</span>"; }).join("") + "</div></div></article>";
    });
    h += '<div class="actions" style="margin-top:6px"><button class="btn line" id="pastBtn">' + (state.showPast ? "Elmúlt alkalmak elrejtése" : "Elmúlt alkalmak mutatása") + "</button></div>";
    if (state.updated) h += '<div class="fresh">Frissítve: ' + esc(fmtStamp(state.updated)) + "</div>";
    h += '<div class="status" id="shareStatus" role="status"></div>';
    $("v-alkalmak").innerHTML = h;
  }

  function tile(t, s, u) { return '<a class="tile" href="' + esc(u) + '" target="_blank" rel="noopener"><b>' + esc(t) + "</b><span>" + esc(s) + "</span></a>"; }

  function renderHirek() {
    var h = '<h2 class="sec" style="margin-top:4px">Hírek</h2>';
    if (!state.news.length) h += '<p class="empty">Még nincs hír.</p>';
    state.news.forEach(function (n) {
      h += '<article class="news"><time datetime="' + esc(n.published_on) + '">' + esc(String(n.published_on).replace(/-/g, ".")) + "</time><h3>" + esc(n.title) + "</h3><p>" + esc(n.body) + "</p>" +
        (n.url ? '<a class="more" style="color:var(--accent);font-weight:600;font-size:13px" href="' + esc(n.url) + '" target="_blank" rel="noopener">Elolvasom →</a>' : "") + "</article>";
    });
    h += '<h2 class="sec">Olvasnivaló és segédanyag</h2><div class="grid">' +
      tile("Tesó Blog", "Írások fiataloknak", "https://www.teso.blog/") +
      tile("Ifióravázlatok", "Segédanyag ifivezetőknek", "https://krisz.org/segedanyagok/ifioravazlatok") +
      tile("Imafüzetek", "Az imahét füzetei", "https://krisz.org/segedanyagok/imafuzetek") +
      tile("Bibliapp", "Biblia, énekeskönyv, Kalauz", "https://apps.apple.com/app/id1345626787") + "</div>";
    $("v-hirek").innerHTML = h;
  }

  function crow(k, v) { return '<div class="crow"><div><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div><button class="copy" data-copy="' + esc(v) + '">Másolás</button></div>'; }

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var deferredInstall = null;

  function pushSupported() { return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }

  function renderKapcsolat() {
    var h = '<h2 class="sec" style="margin-top:4px">Felületeink</h2><div class="grid">' +
      tile("Instagram", "@kriszifjusag", "https://www.instagram.com/kriszifjusag") +
      tile("Facebook", "kriszkriszkozosseg", "https://www.facebook.com/kriszkriszkozosseg") +
      tile("TikTok", "@kriszifi", "https://www.tiktok.com/@kriszifi") +
      tile("YouTube", "@kriszifjusag", "https://www.youtube.com/@kriszifjusag") +
      tile("Threads", "@kriszifjusag", "https://www.threads.net/@kriszifjusag") +
      tile("Weboldal", "krisz.org", "https://krisz.org") + "</div>";
    h += '<h2 class="sec">Értesítések</h2><div class="panel" id="pushPanel">' + pushPanel() + "</div>";
    if (!standalone) {
      h += '<div class="install"><b>Tedd ki a kezdőképernyőre</b>' +
        (deferredInstall ? '<div class="actions" style="margin-top:8px"><button class="btn primary" id="installBtn">Telepítés</button></div>' :
          "<ol><li>iPhone: Safari → Megosztás → „Főképernyőhöz adás”.</li><li>Android: Chrome → ⋮ menü → „Hozzáadás a kezdőképernyőhöz”.</li></ol>") + "</div>";
    }
    h += '<h2 class="sec">Elérhetőségek</h2><div class="contact">' + crow("E-mail", "kriszpont@gmail.com") + crow("Telefon", "+38 099 254 8127") + crow("KRISZ pont", "Széchenyi út 48., Beregszász") + "</div>";
    h += '<h2 class="sec">Csatlakoznál?</h2><div class="actions"><a class="btn primary" href="' + JOIN + '" target="_blank" rel="noopener">KRISZ tag leszek!</a><a class="btn line" href="https://krisz.org/tamogatas" target="_blank" rel="noopener">Támogatás</a></div>';
    h += '<div class="status" id="copyStatus" role="status"></div>';
    h += '<div class="foot">' + (state.editor ? "Belépve: " + esc(state.email) + ' · <button class="linkbtn" id="logoutBtn">Kilépés</button>' : sb ? '<button class="linkbtn" id="editorLogin">Belépés szerkesztőknek</button>' : "") + "</div>";
    $("v-kapcsolat").innerHTML = h;
  }

  function pushPanel() {
    if (!sb || !CFG.vapidPublicKey) return '<p class="note" style="margin:0">Az értesítések hamarosan érkeznek.</p>';
    if (!pushSupported()) {
      if (isIOS && !standalone) return '<p class="note" style="margin:0">iPhone-on előbb tedd ki az appot a kezdőképernyőre (lásd lent), majd onnan megnyitva kapcsold be az értesítéseket.</p>';
      return '<p class="note" style="margin:0">Ez a böngésző nem támogatja az értesítéseket.</p>';
    }
    if (Notification.permission === "denied") return '<p class="note" style="margin:0">Az értesítések le vannak tiltva. A telefon beállításaiban, ennél az appnál kapcsolhatod vissza.</p>';
    var on = load("krisz-push") === true && Notification.permission === "granted";
    return "<h3>" + (on ? "Értesítések bekapcsolva" : "Szólunk, ha új alkalom van") + '</h3><p class="note">' +
      (on ? "Ezen az eszközön kapsz értesítést az új alkalmakról és fontos hírekről." : "Évente néhány értesítés: új alkalmak, változások, fontos hírek.") + "</p>" +
      (on ? "" : '<button class="btn primary" id="pushBtn">Értesítések bekapcsolása</button>') +
      '<div class="status" id="pushStatus" role="status">' + esc(state.pushMsg) + "</div>";
  }

  function urlB64(base64) {
    var pad = "=".repeat((4 - base64.length % 4) % 4);
    var raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function enablePush() {
    var st = $("pushStatus"), btn = $("pushBtn");
    if (btn) btn.disabled = true;
    if (st) st.textContent = "Engedély kérése…";
    Notification.requestPermission().then(function (perm) {
      if (perm !== "granted") throw new Error("Nem engedélyezted az értesítéseket.");
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return reg.pushManager.getSubscription().then(function (s) {
        return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(CFG.vapidPublicKey) });
      });
    }).then(function (sub) {
      var j = sub.toJSON();
      return sb.from("push_subscriptions").insert({ endpoint: j.endpoint, subscription: j }).then(function (r) {
        if (r.error && r.error.code !== "23505") throw new Error("A feliratkozást nem sikerült elmenteni. Próbáld újra később.");
      });
    }).then(function () {
      store("krisz-push", true); state.pushMsg = ""; renderKapcsolat();
    }).catch(function (e) {
      state.pushMsg = e.message || "Nem sikerült bekapcsolni."; renderKapcsolat();
    });
  }

  /* ---------- editor ---------- */
  function renderLogin() {
    var h = '<h2 class="sec" style="margin-top:4px">Belépés szerkesztőknek</h2>';
    if (state.loginSent) {
      h += '<div class="panel"><h3>Nézd meg a postafiókodat</h3><p class="note" style="margin:0">Küldtünk egy belépő linket. Nyisd meg ugyanazon az eszközön.</p></div>';
    } else {
      h += '<form class="panel" id="loginForm"><div class="field"><label for="loginEmail">E-mail cím</label><input id="loginEmail" type="email" autocomplete="email" required placeholder="kriszpont@gmail.com"></div>' +
        '<button class="btn primary" type="submit">Belépő link küldése</button><div class="status" id="loginStatus" role="status"></div></form>';
    }
    h += '<button class="linkbtn" data-goto="kapcsolat">← Vissza</button>';
    $("v-szerk").innerHTML = h;
  }

  function loadEditorData() {
    return Promise.all([
      sb.from("suggestions").select("*").eq("status", "pending").order("created_at"),
      sb.from("sources").select("*").order("id")
    ]).then(function (r) {
      state.suggestions = r[0].data || []; state.sources = r[1].data || [];
      renderSzerk();
    });
  }

  function renderSzerk() {
    if (!state.editor) { renderLogin(); return; }
    var byId = {}; state.events.forEach(function (e) { byId[e.id] = e; });
    var lab = { start_date: "Dátum", end_date: "Befejezés", place: "Helyszín", title: "Cím", description: "Leírás", url: "Link" };
    var h = '<h2 class="sec" style="margin-top:4px">Javasolt frissítések</h2><p class="note">Az asszisztens összeveti a forrásokat, és ide gyűjti az eltéréseket. Csak az kerül ki, amit jóváhagysz.</p>';
    if (!state.suggestions.length) h += '<p class="empty">Nincs jóváhagyásra váró javaslat.</p>';
    state.suggestions.forEach(function (s) {
      var ev = byId[s.event_id];
      h += '<article class="sug' + (s.is_private ? " private" : "") + (s.kind === "gap" ? " gap" : "") + '"><div class="kind">' + (s.kind === "new" ? "Új alkalom" : s.kind === "gap" ? "Hiányzó adat" : "Módosítás") + "</div><h3>" + esc(s.title) + "</h3>";
      if (s.kind === "update") {
        h += '<div class="diff">';
        Object.keys(s.changes || {}).forEach(function (k) {
          var nv = s.changes[k], ov = ev ? ev[k] : "";
          if (k === "start_date" || k === "end_date") { ov = ov ? dateLabel({ start_date: ov }) : "nincs megadva"; nv = dateLabel({ start_date: nv }); }
          h += "<span>" + (lab[k] || k) + '</span><span><span class="was">' + esc(ov || "nincs megadva") + '</span> → <span class="now">' + esc(nv) + "</span></span>";
        });
        h += "</div>";
      }
      if (s.kind === "new" && s.new_event) {
        h += '<div class="diff"><span>Dátum</span><span class="now">' + esc(dateLabel(s.new_event)) + '</span><span>Helyszín</span><span class="now">' + esc(s.new_event.place || "–") + "</span></div>";
      }
      h += s.is_private ? '<div class="warn">' + esc(s.reason) + "</div>" : '<p class="note" style="margin-bottom:6px">' + esc(s.reason) + "</p>";
      h += '<div class="from">Forrás: ' + esc(s.source) + '</div><div class="actions">' +
        (s.kind === "gap" ? '<button class="btn line" data-decide="' + s.id + '" data-ok="0">Tudomásul vettem</button>' :
          '<button class="btn primary" data-decide="' + s.id + '" data-ok="1">Jóváhagyom</button><button class="btn line" data-decide="' + s.id + '" data-ok="0">Elvetem</button>') + "</div></article>";
    });
    h += '<div class="status" id="saveStatus" role="status"></div>';

    h += '<h2 class="sec">Értesítés küldése</h2><form class="panel" id="pushForm"><div class="field"><label for="pTitle">Cím</label><input id="pTitle" maxlength="80" required placeholder="Pl. Új alkalom: Imaéjjel"></div>' +
      '<div class="field"><label for="pBody">Szöveg</label><textarea id="pBody" maxlength="200" placeholder="Pl. Október 31-én, szombaton. Gyere te is!"></textarea></div>' +
      '<button class="btn primary" type="submit">Küldés minden feliratkozónak</button><div class="status" id="pStatus" role="status"></div></form>';

    h += '<h2 class="sec">Források</h2><p class="note">Innen dolgozik az asszisztens. Új forrást a Forráslista dokumentumba másolt linkkel lehet felvenni.</p>';
    state.sources.forEach(function (s) {
      h += '<div class="src"><div><span class="eyebrow">' + esc(s.kind) + "</span><br><b>" + esc(s.name) + '</b></div><span class="st' + (s.status === "Tervezett" ? " plan" : "") + '">' + esc(s.status) + "</span><small>" + esc(s.detail) + (s.checked_at ? " · ellenőrizve: " + esc(fmtStamp(s.checked_at)) : "") + "</small></div>";
    });
    $("v-szerk").innerHTML = h;
    var c = state.suggestions.filter(function (s) { return s.kind !== "gap"; }).length;
    $("badge").hidden = !c; $("badge").textContent = c;
  }

  function decide(id, ok, btn) {
    var st = $("saveStatus"); var s = state.suggestions.filter(function (x) { return x.id === id; })[0];
    btn.disabled = true; if (st) st.textContent = "Mentés…";
    sb.rpc("decide_suggestion", { sid: id, approve: ok }).then(function (r) {
      if (r.error) throw r.error;
      return Promise.all([fetchData(), loadEditorData()]);
    }).then(function () {
      var st2 = $("saveStatus"); if (st2) st2.textContent = ok ? "Jóváhagyva, mindenkinél frissül." : "Rendben, lezártuk.";
      if (ok && s && s.kind === "new" && s.new_event && $("pTitle")) {
        $("pTitle").value = "Új alkalom: " + s.new_event.title;
        $("pBody").value = dateLabel(s.new_event) + (s.new_event.place ? ", " + s.new_event.place : "");
      }
    }).catch(function (e) {
      btn.disabled = false; var st3 = $("saveStatus"); if (st3) st3.textContent = "Nem sikerült menteni: " + (e.message || "ismeretlen hiba");
    });
  }

  function setSession(session) {
    var email = session && session.user && session.user.email;
    if (!email) { state.editor = false; state.email = null; $("tabSzerk").hidden = true; renderKapcsolat(); return; }
    sb.rpc("is_editor").then(function (r) {
      state.editor = !!r.data; state.email = email;
      $("tabSzerk").hidden = !state.editor;
      renderKapcsolat();
      if (state.editor) { loadEditorData(); if (location.hash.indexOf("access_token") > -1) { history.replaceState(null, "", location.pathname); show("szerk"); } }
      else { renderLogin(); var st = $("loginStatus"); if (st) st.textContent = "Ez a cím nincs szerkesztőként felvéve."; }
    });
  }

  /* ---------- navigation & events ---------- */
  var VIEWS = ["alkalmak", "hirek", "kapcsolat", "szerk"];
  function show(v) {
    if (VIEWS.indexOf(v) < 0) v = "alkalmak";
    document.querySelectorAll("nav.tabs button").forEach(function (b) { if (b.dataset.v === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    VIEWS.forEach(function (x) { $("v-" + x).hidden = x !== v; });
    if (v === "szerk" && !state.editor) renderLogin();
    if (location.hash !== "#" + v && location.hash.indexOf("access_token") < 0) history.replaceState(null, "", "#" + v);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("nav.tabs button").forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.v); }); });

  function copyText(t, statusId, msg) {
    var st = $(statusId);
    try { navigator.clipboard.writeText(t).then(function () { if (st) st.textContent = msg; }, function () { if (st) st.textContent = t; }); }
    catch (e) { if (st) st.textContent = t; }
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("button,a"); if (!t) return;
    if (t.dataset.f) { state.filter = t.dataset.f; renderAlkalmak(); return; }
    if (t.id === "pastBtn") { state.showPast = !state.showPast; renderAlkalmak(); return; }
    if (t.dataset.share) {
      var e = state.events.filter(function (x) { return x.id === t.dataset.share; })[0];
      var link = (e && e.url) || location.href.split("#")[0];
      if (navigator.share) { navigator.share({ title: e ? e.title : "KRISZ", text: e ? e.title + " – " + dateLabel(e) : "", url: link }).catch(function () {}); }
      else copyText(link, "shareStatus", "A link a vágólapon van.");
      return;
    }
    if (t.dataset.copy) { copyText(t.dataset.copy, "copyStatus", "Kimásolva: " + t.dataset.copy); return; }
    if (t.id === "pushBtn") { enablePush(); return; }
    if (t.id === "installBtn" && deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(function () { deferredInstall = null; renderKapcsolat(); }); return; }
    if (t.id === "editorLogin") { show("szerk"); return; }
    if (t.id === "logoutBtn") { sb.auth.signOut().then(function () { show("alkalmak"); }); return; }
    if (t.dataset.goto) { show(t.dataset.goto); return; }
    if (t.dataset.decide) { decide(t.dataset.decide, t.dataset.ok === "1", t); return; }
  });

  document.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (ev.target.id === "loginForm") {
      var email = $("loginEmail").value.trim(), st = $("loginStatus");
      st.textContent = "Küldés…";
      sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
        if (r.error) { st.textContent = r.error.status === 429 ? "Túl sok kérés. Várj pár percet, és próbáld újra." : "Nem sikerült elküldeni: " + r.error.message; return; }
        state.loginSent = true; renderLogin();
      });
    }
    if (ev.target.id === "pushForm") {
      var ps = $("pStatus"), btn = ev.target.querySelector("button");
      btn.disabled = true; ps.textContent = "Küldés…";
      sb.functions.invoke("send-push", { body: { title: $("pTitle").value, body: $("pBody").value, url: "./#alkalmak" } }).then(function (r) {
        btn.disabled = false;
        if (r.error) { ps.textContent = "Nem sikerült elküldeni. Próbáld újra később."; return; }
        ps.textContent = r.data.total ? "Elküldve " + r.data.sent + " eszközre." : "Még senki nem iratkozott fel értesítésre.";
        if (r.data.sent) { $("pTitle").value = ""; $("pBody").value = ""; }
      });
    }
  });

  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; renderKapcsolat(); });
  window.addEventListener("online", function () { fetchData(); });
  window.addEventListener("offline", function () { $("offline").hidden = false; });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) fetchData(); });

  /* ---------- start ---------- */
  renderKapcsolat();
  var start = (location.hash || "").replace("#", "");
  show(start.indexOf("access_token") > -1 ? "alkalmak" : start || "alkalmak");
  fetchData();
  if (sb) {
    sb.auth.getSession().then(function (r) { setSession(r.data.session); });
    sb.auth.onAuthStateChange(function (evt, session) { if (evt === "SIGNED_IN" || evt === "SIGNED_OUT") setSession(session); });
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
