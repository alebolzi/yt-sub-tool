const { URL } = require('node:url');
const { YoutubeTranscript } = require('youtube-transcript');

const DEFAULT_LANGS = ['it', 'en'];

const LANGUAGE_NAMES = {
  en: 'English',
  it: 'Italian'
};

function extractVideoId(input) {
  const value = String(input || '').trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  try {
    const parsed = new URL(value);

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const watchId = parsed.searchParams.get('v');
    if (/^[a-zA-Z0-9_-]{11}$/.test(watchId || '')) {
      return watchId;
    }

    const pathMatch = parsed.pathname.match(/\/(?:shorts|embed)\/([a-zA-Z0-9_-]{11})/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }
}

function parseLanguages(value) {
  const languages = String(value || '')
    .split(',')
    .map((lang) => lang.trim().toLowerCase())
    .filter(Boolean);

  return languages.length > 0 ? languages : DEFAULT_LANGS;
}

async function fetchTranscriptWithFallback(videoId, requestedLanguages) {
  let lastError = null;

  for (const lang of requestedLanguages) {
    try {
      const snippets = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      return { snippets, languageCode: snippets[0]?.lang || lang };
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const snippets = await YoutubeTranscript.fetchTranscript(videoId);
    return { snippets, languageCode: snippets[0]?.lang || requestedLanguages[0] || DEFAULT_LANGS[0] };
  } catch (error) {
    throw lastError || error;
  }
}

async function buildTranscriptResponse(urlOrId, langValue) {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    return { status: 400, body: { error: 'URL o video ID non valido' } };
  }

  try {
    const requestedLanguages = parseLanguages(langValue);
    const { snippets, languageCode } = await fetchTranscriptWithFallback(videoId, requestedLanguages);
    const text = snippets.map((snippet) => snippet.text).join('\n').trim();

    return {
      status: 200,
      body: {
        video_id: videoId,
        language: LANGUAGE_NAMES[languageCode] || languageCode || 'Unknown',
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

function classifyTranscriptError(error) {
  const message = error?.message || String(error);

  if (/No transcripts are available|No transcript|Transcript is disabled|not available/i.test(message)) {
    return { status: 404, body: { error: 'Nessun sottotitolo trovato per questo video.' } };
  }

  if (/network|fetch|ECONN|ETIMEDOUT|ENOTFOUND|YouTube/i.test(message)) {
    return { status: 502, body: { error: `Errore YouTube: ${message}` } };
  }

  return { status: 500, body: { error: `Errore interno: ${message}` } };
}

module.exports = {
  buildTranscriptResponse,
  extractVideoId,
  parseLanguages
};
