const { createServer } = require('../server');

const SAMPLE_URL = 'https://www.youtube.com/watch?v=G0CiUvzP9C0';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function requestJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertTranscript(baseUrl, lang) {
  const params = new URLSearchParams({ url: SAMPLE_URL, lang });
  const { response, body } = await requestJson(baseUrl, `/api/transcript?${params}`);

  assert(response.status === 200, `Expected 200 for lang=${lang}, got ${response.status}: ${JSON.stringify(body)}`);
  assert(body.video_id === 'G0CiUvzP9C0', `Unexpected video_id for lang=${lang}: ${body.video_id}`);
  assert(body.language_code === 'it', `Expected Italian fallback for lang=${lang}, got ${body.language_code}`);
  assert(body.snippet_count > 100, `Expected more than 100 snippets for lang=${lang}, got ${body.snippet_count}`);
  assert(typeof body.text === 'string' && body.text.length > 1000, `Expected non-empty text for lang=${lang}`);

  console.log(`ok transcript lang=${lang}: ${body.snippet_count} snippets, ${body.text.length} chars`);
}

async function assertBadRequest(baseUrl, path, label) {
  const { response, body } = await requestJson(baseUrl, path);
  assert(response.status === 400, `Expected 400 for ${label}, got ${response.status}: ${JSON.stringify(body)}`);
  assert(typeof body.error === 'string' && body.error.length > 0, `Expected error message for ${label}`);

  console.log(`ok bad request ${label}: ${body.error}`);
}

async function main() {
  const server = createServer();
  const baseUrl = await listen(server);

  try {
    console.log(`smoke server: ${baseUrl}`);
    await assertTranscript(baseUrl, 'it');
    await assertTranscript(baseUrl, 'en,it');
    await assertBadRequest(baseUrl, '/api/transcript', 'missing url');
    await assertBadRequest(baseUrl, '/api/transcript?url=not-a-youtube-url', 'invalid url');
    console.log('smoke passed');
  } finally {
    await close(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
