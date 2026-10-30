// Prüft die Neuschnee-Prognose und schickt eine Push-Nachricht über ntfy,
// wenn es lohnenswert wird (ab lohnenswert_cm) und bei Alarm (ab schwelle_cm).
// Läuft automatisch auf GitHub Actions, siehe .github/workflows/schnee-check.yml.

import { readFile, writeFile } from "node:fs/promises";
import { ladePrognosen, stufe, zeitraum } from "./schnee.js";

const WIEDERHOLEN_NACH_STUNDEN = 48; // dieselbe Meldung kommt frühestens nach 48 h nochmals ...
const WIEDERHOLEN_AB_PLUS_CM = 20; // ... ausser die Prognose steigt um mindestens 20 cm oder erreicht die Alarmgrenze
const VERGESSEN_NACH_TAGEN = 7;

const topic = process.env.NTFY_TOPIC;
if (!topic) {
  console.error("Das Secret NTFY_TOPIC fehlt. Lege es unter Settings > Secrets and variables > Actions an.");
  process.exit(1);
}

const config = JSON.parse(await readFile("skigebiete.json", "utf8"));
const status = JSON.parse(await readFile("state.json", "utf8").catch(() => '{"gemeldet":{}}'));
const jetzt = Math.floor(Date.now() / 1000);

const prognosen = await ladePrognosen(config.skigebiete);
prognosen.sort((a, b) => b.max.cm - a.max.cm);
for (const p of prognosen) {
  p.stufe = stufe(p.max.cm, config);
  console.log(`${p.gebiet.name}: höchstens ${p.max.cm} cm in 24 h`);
}

if (process.env.TEST_MODE === "true") {
  const [spitze] = prognosen;
  const grenzen = config.lohnenswert_cm < config.schwelle_cm
    ? `Ab ${config.lohnenswert_cm} cm Neuschnee in 24 Stunden kommt hier eine Meldung, ab ${config.schwelle_cm} cm ein Alarm.`
    : `Ab ${config.schwelle_cm} cm Neuschnee in 24 Stunden kommt hier ein Alarm.`;
  await sende({
    title: "Schneealarm funktioniert",
    message: `${grenzen} Im Moment am meisten: ${spitze.gebiet.name} mit ${spitze.max.cm} cm.`,
    tags: ["white_check_mark"],
  });
  console.log("Test-Nachricht gesendet.");
}

const neu = prognosen.filter((p) => {
  if (!p.stufe) return false;
  const vorher = status.gemeldet[p.gebiet.name];
  return !vorher
    || jetzt - vorher.zeit > WIEDERHOLEN_NACH_STUNDEN * 3600
    || p.max.cm >= vorher.cm + WIEDERHOLEN_AB_PLUS_CM
    || (p.stufe === "alarm" && vorher.lohnenswert);
});
const alarme = neu.filter((p) => p.stufe === "alarm");
const lohnenswert = neu.filter((p) => p.stufe === "lohnenswert");
const zeilen = (liste) => liste.map((p) => `${p.gebiet.name}: ${p.max.cm} cm, ${zeitraum(p.max.von, p.max.bis)}`).join("\n");
const namen = (liste) => liste.map((p) => p.gebiet.name).join(", ");

if (alarme.length > 0) {
  await sende({
    title: alarme.length === 1
      ? `${alarme[0].max.cm} cm Neuschnee in ${alarme[0].gebiet.name}`
      : `Viel Neuschnee in ${alarme.length} Skigebieten`,
    message: zeilen(alarme),
    tags: ["snowflake"],
    priority: 4,
  });
  console.log(`Alarm gesendet für: ${namen(alarme)}`);
}

if (lohnenswert.length > 0) {
  await sende({
    title: lohnenswert.length === 1
      ? `Lohnenswert: ${lohnenswert[0].max.cm} cm Neuschnee in ${lohnenswert[0].gebiet.name}`
      : `Lohnenswert in ${lohnenswert.length} Skigebieten`,
    message: `${zeilen(lohnenswert)}\nNicht perfekt, aber trotzdem lohnenswert. Ab ${config.schwelle_cm} cm kommt ein Alarm.`,
    tags: ["cloud_with_snow"],
    priority: 3,
  });
  console.log(`Lohnenswert-Meldung gesendet für: ${namen(lohnenswert)}`);
}

for (const p of neu) {
  status.gemeldet[p.gebiet.name] = { zeit: jetzt, cm: p.max.cm, lohnenswert: p.stufe === "lohnenswert" };
}

for (const [name, eintrag] of Object.entries(status.gemeldet)) {
  if (jetzt - eintrag.zeit > VERGESSEN_NACH_TAGEN * 86400) delete status.gemeldet[name];
}
await writeFile("state.json", JSON.stringify(status, null, 2) + "\n");

async function sende(nachricht) {
  const antwort = await fetch("https://ntfy.sh", {
    method: "POST",
    body: JSON.stringify({ topic, click: appAdresse(), ...nachricht }),
  });
  if (!antwort.ok) throw new Error(`ntfy: ${antwort.status} ${await antwort.text()}`);
}

// Adresse der Web-App auf GitHub Pages: Ein Tipp auf die Nachricht öffnet sie.
function appAdresse() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const [besitzer, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  return besitzer && repo ? `https://${besitzer.toLowerCase()}.github.io/${repo}/` : undefined;
}
