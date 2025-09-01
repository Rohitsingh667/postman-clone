import type { NextApiRequest, NextApiResponse } from 'next';
import { getEm } from '../../src/server/orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20', 10)));
  const offset = (page - 1) * pageSize;

  const em = await getEm();
  const [items, total] = await em.findAndCount('RequestLog' as any, {}, {
    limit: pageSize,
    offset,
    orderBy: { createdAt: 'DESC' },
    fields: ['id', 'method', 'url', 'status', 'durationMs', 'createdAt'],
  });

  return res.status(200).json({ items, total, page, pageSize });
}
