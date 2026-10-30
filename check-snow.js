// Prüft die Neuschnee-Prognose und schickt bei Alarm eine Push-Nachricht über ntfy.
// Läuft automatisch auf GitHub Actions, siehe .github/workflows/schnee-check.yml.

import { readFile, writeFile } from "node:fs/promises";
import { ladePrognosen, zeitraum } from "./schnee.js";

const WIEDERHOLEN_NACH_STUNDEN = 48; // derselbe Alarm kommt frühestens nach 48 h nochmals ...
const WIEDERHOLEN_AB_PLUS_CM = 20; // ... ausser die Prognose steigt um mindestens 20 cm
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
for (const p of prognosen) console.log(`${p.gebiet.name}: höchstens ${p.max.cm} cm in 24 h`);

if (process.env.TEST_MODE === "true") {
  const [spitze] = prognosen;
  await sende({
    title: "Schneealarm funktioniert",
    message: `Ab ${config.schwelle_cm} cm Neuschnee in 24 Stunden kommt hier ein Alarm. Im Moment am meisten: ${spitze.gebiet.name} mit ${spitze.max.cm} cm.`,
    tags: ["white_check_mark"],
  });
  console.log("Test-Nachricht gesendet.");
}

const neu = prognosen.filter((p) => {
  if (p.max.cm < config.schwelle_cm) return false;
  const vorher = status.gemeldet[p.gebiet.name];
  return !vorher
    || jetzt - vorher.zeit > WIEDERHOLEN_NACH_STUNDEN * 3600
    || p.max.cm >= vorher.cm + WIEDERHOLEN_AB_PLUS_CM;
});

if (neu.length > 0) {
  await sende({
    title: neu.length === 1
      ? `${neu[0].max.cm} cm Neuschnee in ${neu[0].gebiet.name}`
      : `Viel Neuschnee in ${neu.length} Skigebieten`,
    message: neu.map((p) => `${p.gebiet.name}: ${p.max.cm} cm, ${zeitraum(p.max.von, p.max.bis)}`).join("\n"),
    tags: ["snowflake"],
    priority: 4,
  });
  console.log(`Alarm gesendet für: ${neu.map((p) => p.gebiet.name).join(", ")}`);
  for (const p of neu) status.gemeldet[p.gebiet.name] = { zeit: jetzt, cm: p.max.cm };
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
