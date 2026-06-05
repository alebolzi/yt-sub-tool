const { URL } = require('node:url');
const { YoutubeTranscript } = require('youtube-transcript');

const DEFAULT_LANGS = ['it', 'en'];

const LANGUAGE_NAMES = {
  en: 'English',
  it: 'Italian'
};

// -------------------------
// UTILS
// -------------------------

function timeoutPromise(promise, ms = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout")), ms);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(t));
  });
}

function extractVideoId(input) {
  const value = String(input || '').trim();

  // raw ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const parsed = new URL(value);

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const watchId = parsed.searchParams.get('v');
    if (/^[a-zA-Z0-9_-]{11}$/.test(watchId || '')) return watchId;

    const pathMatch = parsed.pathname.match(/\/(?:shorts|embed)\/([a-zA-Z0-9_-]{11})/);
    return pathMatch ? pathMatch[1] : null;

  } catch {
    const match = value.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }
}

function parseLanguages(value) {
  const langs = String(value || '')
    .split(',')
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);

  return langs.length ? langs : DEFAULT_LANGS;
}

// -------------------------
// CORE LOGIC
// -------------------------

async function fetchTranscriptWithFallback(videoId, requestedLanguages) {
  const tryList = [...requestedLanguages, undefined];

  let lastError = null;

  for (const lang of tryList) {
    try {
      const options = lang ? { lang } : {};

      const snippets = await timeoutPromise(
        YoutubeTranscript.fetchTranscript(videoId, options),
        8000
      );

      if (snippets && snippets.length) {
        return {
          snippets,
          languageCode: lang || requestedLanguages[0] || 'unknown'
        };
      }

    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Transcript non disponibile');
}

// -------------------------
// RESPONSE BUILDER
// -------------------------

async function buildTranscriptResponse(urlOrId, langValue) {
  const videoId = extractVideoId(urlOrId);

  if (!videoId) {
    return {
      status: 400,
      body: { error: 'URL o video ID non valido' }
    };
  }

  try {
    const requestedLanguages = parseLanguages(langValue);

    const { snippets, languageCode } =
      await fetchTranscriptWithFallback(videoId, requestedLanguages);

    const text = snippets
      .map(s => s.text)
      .join('\n')
      .trim();

    return {
      status: 200,
      body: {
        video_id: videoId,
        language: LANGUAGE_NAMES[languageCode] || languageCode,
        language_code: languageCode,
        is_generated: null,
        text,
        snippet_count: snippets.length
      }
    };

  } catch (error) {
    return classifyTranscriptError(error);
  }
}

// -------------------------
// ERROR HANDLING
// -------------------------

function classifyTranscriptError(error) {
  const message = error?.message || String(error);

  if (/No transcripts|Transcript is disabled|not available/i.test(message)) {
    return {
      status: 404,
      body: { error: 'Nessun sottotitolo trovato per questo video.' }
    };
  }

  if (/timeout|network|ECONN|ETIMEDOUT|ENOTFOUND|YouTube/i.test(message)) {
    return {
      status: 502,
      body: { error: `Errore rete/YouTube: ${message}` }
    };
  }

  return {
    status: 500,
    body: { error: `Errore interno: ${message}` }
  };
}

// -------------------------
// EXPORT
// -------------------------

module.exports = {
  buildTranscriptResponse,
  extractVideoId,
  parseLanguages
};
