import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getEm } from '../../src/server/orm';

function sanitizeHeaders(input?: Record<string, string>) {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const [k, v] of Object.entries(input)) {
    const key = k.toLowerCase();
    if (['host', 'content-length'].includes(key)) continue;
    out[key] = v;
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const { method, url, headers, body } = req.body as {
      method: string; url: string; headers?: Record<string, string>; body?: any;
    };
    if (!method || !url) return res.status(400).json({ error: 'method and url are required' });
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return res.status(400).json({ error: 'Only http/https protocols are allowed' });
    }

    const init: RequestInit = {
      method,
      headers: sanitizeHeaders(headers),
    } as RequestInit;
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
      (init.headers as any)['content-type'] = (init.headers as any)['content-type'] || 'application/json';
    }

    const start = Date.now();
    const response = await fetch(url, init);
    const respText = await response.text();
    const duration = Date.now() - start;

    const respHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });

    const em = await getEm();
    const log = em.create('RequestLog' as any, { id: randomUUID(),
      method,
      url,
      requestHeaders: sanitizeHeaders(headers),
      requestBody: typeof body === 'string' ? body : body != null ? JSON.stringify(body) : null,
      status: response.status,
      responseHeaders: respHeaders,
      responseBody: respText,
      durationMs: duration,
    });
    await em.persistAndFlush(log);

    return res.status(200).json({
      status: response.status,
      headers: respHeaders,
      body: respText,
      durationMs: duration,
      logId: log.id,
    });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Internal error' });
  }
}
