const { buildTranscriptResponse } = require('../lib/transcript');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo non supportato' });
  }

  const url = req.query?.url;
  if (!url) {
    return res.status(400).json({ error: 'Parametro url mancante' });
  }

  const result = await buildTranscriptResponse(url, req.query?.lang);
  res.status(result.status).json(result.body);
};
