function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { status: 'error', message: 'Method not allowed.' });
  }

  const gasUrl = process.env.VITE_ADMIN_GAS_URL;
  if (!gasUrl) {
    return respond(res, 500, { status: 'error', message: 'Admin backend is not configured.' });
  }

  let endpoint;
  try {
    endpoint = new URL(gasUrl);
  } catch {
    return respond(res, 500, { status: 'error', message: 'Admin backend URL is invalid.' });
  }

  if (endpoint.protocol !== 'https:') {
    return respond(res, 500, { status: 'error', message: 'Admin backend URL must use HTTPS.' });
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return respond(res, 400, { status: 'error', message: 'Request body must be valid JSON.' });
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return respond(res, 400, { status: 'error', message: 'Request body must be a JSON object.' });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const responseBody = await upstream.text();

    res.statusCode = upstream.status;
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/json; charset=utf-8',
    );
    return res.end(responseBody);
  } catch {
    return respond(res, 502, { status: 'error', message: 'Unable to reach the admin backend.' });
  }
}
