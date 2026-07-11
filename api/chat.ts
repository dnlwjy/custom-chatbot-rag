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

  const { messages, model, temperature } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-5-nano',
        messages: messages,
        ...(model !== 'gpt-5-nano' && temperature !== undefined ? { temperature } : {}),
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res.status(response.status).json(errorData);
      return;
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    if (!response.body) {
      res.status(500).json({ error: 'Response body is empty' });
      return;
    }

    const reader = response.body.getReader();
    
    // Stream chunks back to client
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (error: any) {
    console.error('Serverless function error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
