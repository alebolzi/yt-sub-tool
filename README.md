# YT Subtitle Extractor - Bolzi Lab

Tool paste-and-go per estrarre sottotitoli da video YouTube.

## Stack ufficiale

- **Backend**: Node
- **Transcript**: `youtube-transcript`
- **Frontend**: HTML/CSS/JS puro in `public/`

Locale e Vercel usano la stessa logica in `lib/transcript.js`.

- `server.js` e solo l'adapter per sviluppo locale.
- `api/transcript.js` e solo l'adapter Vercel per lo stesso endpoint `/api/transcript`.

Python non fa parte del flusso supportato. Non aggiungere un secondo backend.

## Setup

```bash
npm install
```

## Avvio locale

```bash
npm run dev
```

Poi apri:

```text
http://localhost:3000
```

## Smoke test reale

```bash
npm run smoke
```

Lo smoke test avvia il server su una porta temporanea e verifica:

- transcript reale per `https://www.youtube.com/watch?v=G0CiUvzP9C0`
- fallback lingua da `en,it` verso italiano
- errore 400 per parametro `url` mancante
- errore 400 per URL/video ID non valido

## Deploy su Vercel

Questo progetto e gia pronto per Vercel senza backend Python.

```bash
npm i -g vercel
vercel
```

Vercel servira automaticamente:

- `/` dai file statici in `public/`
- `/api/transcript` dalla funzione Node `api/transcript.js`

La logica resta identica al locale perche entrambi importano `lib/transcript.js`.

## API

### GET `/api/transcript`

Parametri query:

| Param | Tipo | Default | Descrizione |
| --- | --- | --- | --- |
| `url` | string | - | URL YouTube o video ID, obbligatorio |
| `lang` | string | `it,en` | Lingue preferite, separate da virgola |

Risposta OK:

```json
{
  "video_id": "G0CiUvzP9C0",
  "language": "Italian",
  "language_code": "it",
  "is_generated": null,
  "text": "...",
  "snippet_count": 499
}
```

Risposta errore:

```json
{
  "error": "URL o video ID non valido"
}
```

## Note

- Nessuna API key richiesta.
- Il fallback lingua prova prima le lingue richieste in ordine, poi qualsiasi transcript disponibile.
- Se YouTube cambia markup o blocca richieste, lo smoke test e l'endpoint possono fallire finche la libreria transcript non viene aggiornata.
- Non ripristinare `requirements.txt`, backend Python o una seconda API separata.
