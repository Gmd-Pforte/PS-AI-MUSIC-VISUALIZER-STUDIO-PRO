# PS AI MUSIC – Visualizer Studio Pro 1.0

Mobile-first, browserbasierter Audio-Visualizer mit Musikplayer und Live-Editor. Für GitHub Pages geeignet, ohne Server und ohne kostenpflichtige API.

## Funktionen 1.0

- Musikdateien lokal importieren, Warteschlange, Play/Pause, Spulen, Lautstärke, Zufallswiedergabe und Repeat
- Canvas-Visualizer mit Web Audio API (FFT, Frequenzspektrum, Wellenform)
- Ebenen: Kreis-Spektrum, Balken, Welle, Partikel, Bild, Text
- Ebenen umordnen, sichtbar/unsichtbar schalten, duplizieren, löschen und mit Touch verschieben
- Regler für Farben, Position, Größe, Drehung, Transparenz, Audio-Empfindlichkeit und weitere Eigenschaften
- Seitenverhältnisse 9:16, 16:9 und 1:1, Hilfslinien
- Vier Startvorlagen, eigene Vorlagen im lokalen Browser-Speicher, JSON-Projektimport/-export
- Installierbare PWA, offline nutzbare Oberfläche nach erstem Laden
- Experimenteller Echtzeit-Videorecorder via MediaRecorder, Browser-abhängiges MP4/WebM

## GitHub Pages

In **Settings → Pages** Quelle **Deploy from a branch** auswählen, Branch `main`, Verzeichnis `/ (root)`. Die App ist eine statische Seite und benötigt keinen Build.

## Wichtige Hinweise

- Musik wird nur lokal im Browser geöffnet, nicht auf GitHub oder einen Server hochgeladen.
- Lokale Audiodateien können aus Sicherheitsgründen nicht dauerhaft zwischen Sitzungen wieder geöffnet werden, ohne erneut ausgewählt zu werden.
- Bilddateien werden als Daten-URL in Projekten gespeichert. Große Bilder können die Browser-Speichergrenze überschreiten.
- Der Recorder zeichnet in Echtzeit auf. H.264/MP4 ist nicht in allen Browsern mit MediaRecorder verfügbar; WebM ist oft die Alternative.
- 4K, zuverlässiger Offline-Render, echte Avee-.viz-Kompatibilität, Equalizer und ausgebaute Timeline sind spätere Ausbaustufen.
- Das Projekt ist eine eigenständige Implementierung und steht nicht in Verbindung mit Avee Player.

## Entwicklung

`index.html` direkt über einen lokalen HTTP-Server ausliefern, z. B. `python3 -m http.server 8080`. Ohne HTTP/HTTPS sind PWA-Funktionen und manche Browser-Audiofunktionen eingeschränkt.
