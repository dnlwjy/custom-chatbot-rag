export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the Vercel server.' });
    return;
  }

  const { input } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: input
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
