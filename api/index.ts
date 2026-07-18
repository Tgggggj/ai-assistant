import app from '../server/index';
import type { Request, Response } from 'express';

function normalizeRewrittenUrl(req: Request) {
  const originalUrl = req.url ?? '/';
  const url = new URL(originalUrl, `http://${req.headers.host ?? 'localhost'}`);
  const path = url.searchParams.get('path');

  if (!path || !url.pathname.startsWith('/api/index')) return;

  url.searchParams.delete('path');
  const query = url.searchParams.toString();
  req.url = `/api/${path}${query ? `?${query}` : ''}`;
}

export default function handler(req: Request, res: Response) {
  normalizeRewrittenUrl(req);
  return app(req, res);
}
