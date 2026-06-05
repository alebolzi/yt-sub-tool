const { buildTranscriptResponse } = require('../lib/transcript');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async function transcriptHandler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Metodo non supportato' });
    return;
  }

  const url = getQueryValue(req.query?.url);
  if (!url) {
    res.status(400).json({ error: 'Parametro url mancante' });
    return;
  }

  const result = await buildTranscriptResponse(url, getQueryValue(req.query?.lang));
  res.status(result.status).json(result.body);
};
