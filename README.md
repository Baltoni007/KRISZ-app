# KRISZ App

A Kárpátaljai Református Ifjúsági Szervezet (KRISZ) telepíthető webalkalmazása: alkalmak, hírek, közösségi felületek és értesítések egy helyen.

## Felépítés

- **Az app** (ez a repó): statikus fájlok, a GitHub Pages szolgálja ki. Telefonon a kezdőképernyőre tehető, offline is megnyílik.
- **Az adatok**: Supabase adatbázis (alkalmak, hírek, AI-javaslatok, értesítési feliratkozások).
- **Frissítés**: az AI-asszisztens hetente összeveti a forrásokat (krisz.org, éves programterv, jegyzőkönyvek, Forráslista), és javaslatokat tesz. A szerkesztő az appban hagyja jóvá őket.

## Fájlok

| Fájl | Szerepe |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Maga az app |
| `config.js` | Supabase cím és nyilvános kulcs (nem titkos) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Telepítés, offline működés, értesítések |
| `data.json` | Tartalék adatok, ha az adatbázis nem érhető el |
| `supabase/migrations/` | Adatbázis-séma és kezdő adatok |
| `supabase/functions/send-push/` | Értesítésküldés (csak szerkesztő hívhatja) |

## Szerkesztők

Szerkesztő az lehet, akinek az e-mail címe szerepel az `editors` táblában. Belépés: Felületeink fül alján „Belépés szerkesztőknek”, e-mailben kapott linkkel.
