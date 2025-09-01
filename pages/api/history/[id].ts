import type { NextApiRequest, NextApiResponse } from 'next';
import { getEm } from '../../../src/server/orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { id } = req.query as { id: string };
  const em = await getEm();
  const item = await em.findOne('RequestLog' as any, { id });
  if (!item) return res.status(404).json({ error: 'Not found' });
  return res.status(200).json(item);
}
