// Gemeinsame Logik für die Web-App (index.html) und den Server-Check (check-snow.js).

export const FENSTER_STUNDEN = 24; // Neuschnee wird über 24 Stunden zusammengezählt
export const VORSCHAU_STUNDEN = 72; // so weit voraus wird nach Alarmen gesucht

const ZEITZONE = "Europe/Zurich";
const API = "https://api.open-meteo.com/v1/forecast";

// Holt die Prognose für alle Skigebiete mit einer einzigen Anfrage an Open-Meteo.
// 4 Kalendertage decken die 72-Stunden-Vorschau ab, egal zu welcher Uhrzeit geprüft wird.
export async function ladePrognosen(skigebiete, tage = 4) {
  const params = new URLSearchParams({
    latitude: skigebiete.map((g) => g.lat).join(","),
    longitude: skigebiete.map((g) => g.lon).join(","),
    hourly: "snowfall",
    daily: "snowfall_sum",
    timezone: ZEITZONE,
    timeformat: "unixtime",
    forecast_days: tage,
  });
  if (skigebiete.every((g) => g.hoehe)) {
    params.set("elevation", skigebiete.map((g) => g.hoehe).join(","));
  }

  const antwort = await fetch(`${API}?${params}`);
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(`Open-Meteo: ${daten.reason ?? antwort.status}`);

  const liste = Array.isArray(daten) ? daten : [daten];
  const jetzt = Date.now() / 1000;
  return skigebiete.map((gebiet, i) => ({
    gebiet,
    max: maxNeuschnee(liste[i].hourly.time, liste[i].hourly.snowfall, jetzt),
    tage: liste[i].daily.time.map((zeit, t) => ({ zeit, cm: liste[i].daily.snowfall_sum[t] ?? 0 })),
  }));
}

// Grösste Neuschneemenge (cm) in einem 24-Stunden-Fenster innerhalb der nächsten 72 Stunden.
// Ein Stundenwert von Open-Meteo gilt für die Stunde *vor* seinem Zeitstempel.
export function maxNeuschnee(zeiten, werte, jetzt) {
  let best = { cm: 0, von: null, bis: null };
  for (let i = zeiten.findIndex((t) => t > jetzt); i >= 0 && i + FENSTER_STUNDEN <= zeiten.length; i++) {
    const bis = zeiten[i + FENSTER_STUNDEN - 1];
    if (bis > jetzt + VORSCHAU_STUNDEN * 3600) break;
    let summe = 0;
    for (let j = i; j < i + FENSTER_STUNDEN; j++) summe += werte[j] ?? 0;
    if (summe > best.cm) best = { cm: summe, von: zeiten[i] - 3600, bis };
  }
  best.cm = Math.round(best.cm);
  return best;
}

const zeitFormat = new Intl.DateTimeFormat("de-CH", {
  timeZone: ZEITZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const tagFormat = new Intl.DateTimeFormat("de-CH", { timeZone: ZEITZONE, weekday: "short", day: "numeric" });

function teile(format, zeit) {
  return Object.fromEntries(format.formatToParts(new Date(zeit * 1000)).map((t) => [t.type, t.value]));
}

// z. B. "Sa 03:00 bis So 03:00"
export function zeitraum(von, bis) {
  const kurz = (zeit) => {
    const t = teile(zeitFormat, zeit);
    return `${t.weekday.replace(".", "")} ${t.hour}:${t.minute}`;
  };
  return `${kurz(von)} bis ${kurz(bis)}`;
}

// z. B. "Sa 1."
export function tagName(zeit) {
  const t = teile(tagFormat, zeit);
  return `${t.weekday.replace(".", "")} ${t.day}.`;
}
