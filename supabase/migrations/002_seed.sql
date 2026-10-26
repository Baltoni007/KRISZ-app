-- Kezdő adatok: krisz.org (2026. október) + Éves programtervezet 8 összevetése

insert into public.editors (email) values ('kriszpont@gmail.com');

insert into public.events (id, title, start_date, end_date, orgs, place, description, tags, url) values
('2026-lendulet', 'Lendület ifjúsági találkozó', '2026-06-27', null, '{KRISZ}', 'Jánosi stadion', 'A XVI. Lendület ifjúsági találkozó egész napos programmal: igei üzenet, dicsőítés, interaktív programok és ebéd.', '{Egésznapos,Dicsőítés,Evangelizáció}', 'https://krisz.org/alkalmaink/2026-lendulet-ifjusagi-talalkozo'),
('2026-krisz-het', 'KRISZ hét', '2026-07-27', '2026-08-01', '{KRISZ}', 'Beregszászi Református Líceum', 'A nyár legfontosabb hete konfirmált, 15 év feletti fiataloknak: előadások, dicsőítés, sport és esti programok.', '{Ottalvós,Előadások,KRISZ7}', 'https://krisz.org/alkalmaink/2026-krisz-het'),
('2026-imaejjel', 'Imaéjjel', null, null, '{KRISZ}', '', 'Éjszakába nyúló közös dicsőítés és imádság interaktív imaállomásokkal és kreatív elcsendesedéssel.', '{Reformáció,Imádság,Dicsőítés}', 'https://krisz.org/alkalmaink/2026-imaejjel'),
('2026-11-merce', 'MÉRCE Ifitalálkozó', '2026-11-07', null, '{"Mérce KA"}', '', 'Pörgős dicsőítés, aktuális kérdésekről szóló igei üzenet, beszélgetés és társasjáték a környékbeli fiatalokkal.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-11-merce-ifitalkozo'),
('2026-11-tiborka', 'TiBorKa Ifitalálkozó', '2026-11-07', null, '{TiBorKa}', '', 'Pörgős dicsőítés, aktuális kérdésekről szóló igei üzenet, beszélgetés és társasjáték a környékbeli fiatalokkal.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-11-tiborka-ifitalalkozo'),
('2026-11-beregi', 'Beregi Ifitalálkozó', '2026-11-14', null, '{"Beregi KA"}', '', 'Pörgős dicsőítés, aktuális kérdésekről szóló igei üzenet, beszélgetés és társasjáték a környékbeli fiatalokkal.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-11-beregi-ifitalalkozo'),
('2026-tohati-kt', 'Tóháti Kt-s hétvége', '2026-11-20', '2026-11-22', '{"Tóháti KA"}', '', 'Hétvége konfirmációra készülő fiataloknak: csapatjátékok, beszélgetések a hit kérdéseiről, tantermi hangulat nélkül.', '{Hétvége,Ottalvós,Kt}', 'https://krisz.org/alkalmaink/2026-tohati-kts-hetvege'),
('2026-11-tiszahat', 'Tiszahát Ifitalálkozó', '2026-11-28', null, '{"Tiszahát KA"}', '', 'Pörgős dicsőítés, aktuális kérdésekről szóló igei üzenet, beszélgetés és társasjáték a környékbeli fiatalokkal.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-11-tiszahat-ifitalalkozo'),
('2026-advent', 'Adventi dicsőítő alkalom', '2026-12-19', null, '{KRISZ}', '', 'Akusztikus dicsőítés, elcsendesedés és személyes üzenet, hogy felkészüljünk Jézus érkezésére.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-adventi-dicsoito-alkalom'),
('2026-12-tiszahat', 'Tiszahát Ifitalálkozó', '2026-12-29', null, '{"Tiszahát KA"}', '', 'Pörgős dicsőítés, aktuális kérdésekről szóló igei üzenet, beszélgetés és társasjáték a környékbeli fiatalokkal.', '{Dicsőítés,Szeretetvendégség}', 'https://krisz.org/alkalmaink/2026-12-tiszahat-ifitalalkozo');

insert into public.news (published_on, title, body, url) values
('2026-09-27', 'Újraszerveződött a KRISZ Band', 'A Covid és a háború miatt szünetelő dicsőítő zenekar újra összeállt, és ismét a településeket járja. Az újraindítást Balázs Antal elnök és Kardos Ágnes referens lelkész kezdeményezte.', 'https://krisz.org/hirek/1');

insert into public.sources (name, kind, detail, status, checked_at) values
('krisz.org – Alkalmaink', 'Weboldal', 'https://krisz.org/alkalmaink/ – alkalmak, leírások, címkék', 'Beolvasva', now()),
('krisz.org – Hírek', 'Weboldal', 'https://krisz.org/hirek/1 – közösségi hírek', 'Beolvasva', now()),
('Éves programtervezet 8', 'Táblázat', '2026_program munkalap – időpontok, helyszínek, megjegyzések', 'Beolvasva', now()),
('Választmányi jegyzőkönyvek', 'Drive-mappa', 'Csak nyilvánosnak szánt döntések kerülhetnek ki', 'Beolvasva', now()),
('KRISZ app – Forráslista', 'Dokumentum', 'Ide másolt linkek (Facebook-események, űrlapok, Drive-mappák)', 'Tervezett', null);

insert into public.suggestions (kind, event_id, title, changes, new_event, source, reason, is_private) values
('update', '2026-imaejjel', 'Imaéjjel – időpont', '{"start_date":"2026-10-31"}', null, 'Éves programtervezet 8 › 2026_program, 44. sor', 'A weboldalon nincs dátum, a programtervben „Okt. 31. – szombat”, egy nagy közös alkalomként, a KRISZ Band szolgálatával.', false),
('update', '2026-11-merce', 'Mérce ifitalálkozó – helyszín', '{"place":"Gát"}', null, 'Éves programtervezet 8 › 2026_program, 46. sor', 'A programtervben a helyszín Gát.', false),
('update', '2026-11-tiborka', 'TiBorKa ifitalálkozó – helyszín', '{"place":"Feketepatak"}', null, 'Éves programtervezet 8 › 2026_program, 47. sor', 'A programtervben a helyszín Feketepatak.', false),
('update', '2026-tohati-kt', 'Tóháti Kt-s hétvége – helyszín', '{"place":"Nagydobronyi Református Líceum"}', null, 'Éves programtervezet 8 › 2026_program, 49. sor', 'A programtervben: „Dobronyi líceum”.', false),
('update', '2026-11-tiszahat', 'Tiszahát ifitalálkozó (nov. 28.) – helyszín és téma', '{"place":"Tekeháza","title":"Hálaadó ifitalálkozó – Tiszahát"}', null, 'Éves programtervezet 8 › 2026_program, 50. sor', 'A programtervben Tekeháza, „Hálaadó” témával.', false),
('update', '2026-12-tiszahat', 'Tiszahát ifitalálkozó (dec. 29.) – helyszín és téma', '{"place":"Nevetlenfalu","title":"Óévi ifitalálkozó – Tiszahát"}', null, 'Éves programtervezet 8 › 2026_program, 54. sor', 'A programtervben Nevetlenfalu, óévi alkalomként.', false),
('new', null, 'Új alkalom: Munkatársi hétvége + szövi', '{}', '{"id":"2026-11-munkatarsi","title":"Munkatársi hétvége + szövi","start_date":"2026-11-20","end_date":"2026-11-21","orgs":["KRISZ"],"place":"Beregi hegy","description":"Hétvége a KRISZ tagjainak és munkatársainak.","tags":["KRISZ tagoknak","Hétvége"],"url":""}', 'Éves programtervezet 8 › 2026_program, 51. sor', 'Belső alkalom (KRISZ tagok). Csak akkor hagyd jóvá, ha a meghívás nyilvános lehet.', true),
('gap', '2026-advent', 'Adventi dicsőítő – hiányzó helyszín', '{}', null, 'Weboldal és programterv összevetése', 'Egyik forrásban sincs helyszín (tavaly Bátyú volt). Írd be a programtervbe, és a következő frissítés átveszi.', false);
