# Schneealarm-wenduweischduweisch

Prüft alle 3 Stunden die Neuschnee-Prognose für deine Skigebiete. Sind innert 24 Stunden mindestens 50 cm Neuschnee angesagt, bekommen du und dein Kollege eine Push-Nachricht aufs iPhone.

So funktioniert es:

- **Schnee-Check:** läuft gratis auf GitHub, auch wenn dein Handy und dein PC aus sind (`check-snow.js`).
- **Push-Nachricht:** kommt über die Gratis-App **ntfy**. Ihr beide abonniert denselben geheimen Kanal.
- **Web-App:** zeigt die Prognose für alle Skigebiete. Du legst sie wie eine App auf den Home-Bildschirm (`index.html`).
- **Wetterdaten:** von [Open-Meteo](https://open-meteo.com/), gratis und ohne Anmeldung.

## Einrichten (einmalig, ca. 15 Minuten)

Du brauchst einen PC mit Browser und einen geheimen Kanalnamen, zum Beispiel `schneealarm-` gefolgt von 14 zufälligen Zeichen. Wer den Namen kennt, kann die Nachrichten mitlesen. Speichere ihn deshalb nirgends im Repository.

1. **GitHub-Konto erstellen** auf [github.com](https://github.com/signup) (gratis).
2. **Repository anlegen:** oben rechts **+** › **New repository**. Name `schneealarm`, Sichtbarkeit **Public**, sonst nichts ankreuzen › **Create repository**.
3. **Dateien hochladen:** Klicke auf den Link **uploading an existing file**. Öffne den Ordner `schneealarm` auf deinem PC, markiere seinen **gesamten Inhalt** (auch den Ordner `.github`) und ziehe ihn ins Browserfenster › **Commit changes**.
   Prüfe danach, ob der Ordner `.github` im Repository auftaucht. Falls nicht: **Add file** › **Create new file**, als Namen `.github/workflows/schnee-check.yml` eintippen, den Inhalt der gleichnamigen Datei hineinkopieren › **Commit changes**.
4. **Geheimen Kanal hinterlegen:** **Settings** › **Secrets and variables** › **Actions** › **New repository secret**. Name: `NTFY_TOPIC`, Secret: dein Kanalname › **Add secret**.
5. **Web-App einschalten:** **Settings** › **Pages**. Bei *Source* **Deploy from a branch** wählen, Branch **main**, Ordner **/ (root)** › **Save**. Nach 1 bis 2 Minuten läuft die App unter `https://DEIN-GITHUB-NAME.github.io/schneealarm/`.
6. **ntfy auf beiden iPhones:** Die App **ntfy** aus dem App Store laden und öffnen, Mitteilungen erlauben. Dann **+** antippen, den Kanalnamen eingeben › **Subscribe**. Dein Kollege macht dasselbe mit demselben Namen.
7. **Testen:** Im Repository auf **Actions** › **Schnee-Check** › **Run workflow**. «Test-Nachricht an alle Handys senden» ist angekreuzt › **Run workflow**. Nach etwa 30 Sekunden sollten beide iPhones die Nachricht «Schneealarm funktioniert» anzeigen.
8. **Web-App aufs iPhone:** Die Adresse aus Schritt 5 in **Safari** öffnen › Teilen-Symbol › **Zum Home-Bildschirm**.

## Skigebiete und Grenze ändern

Öffne `skigebiete.json` im Repository und tippe auf den Stift zum Bearbeiten.

```json
{ "name": "Laax", "lat": 46.84, "lon": 9.225, "hoehe": 2200 }
```

- `lat` / `lon`: Koordinaten. In Google Maps lange auf die Karte drücken (am PC: Rechtsklick), dann werden sie angezeigt.
- `hoehe`: Höhe in Metern, für die die Prognose gerechnet wird. Am besten die mittlere Pistenhöhe.
- `schwelle_cm`: ab wie vielen Zentimetern Neuschnee in 24 Stunden ein Alarm kommt.

Achte auf Kommas zwischen den Einträgen. Nach dem Speichern gilt die Änderung ab dem nächsten Check.

## Gut zu wissen

- Geprüft wird alle 3 Stunden zwischen etwa 6 und 22 Uhr, also nicht nachts. GitHub startet die Checks manchmal bis zu einer Stunde später.
- Derselbe Alarm kommt höchstens alle 48 Stunden, ausser die Prognose steigt um mindestens 20 cm.
- Gemeldete Alarme merkt sich der Check in `state.json`. Diese Datei nicht von Hand ändern.
- GitHub pausiert automatische Checks in öffentlichen Repositories nach 60 Tagen ohne Aktivität (meist im Sommer) und schickt vorher eine E-Mail. Im Herbst unter **Actions** › **Schnee-Check** auf **Enable workflow** tippen.
- Alles ist gratis: GitHub Actions, GitHub Pages, ntfy und Open-Meteo.
- Wetterprognosen können danebenliegen, besonders mehr als 2 Tage im Voraus.
