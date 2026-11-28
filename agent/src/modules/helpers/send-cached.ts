import { HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Відповідь з ETag `"<scope>:<rev>"` і `Cache-Control: private, no-cache`: браузер щоразу звіряється, `If-None-Match`
 * з тим самим тегом дає `304` без тіла. `max-age` немає — layout може змінитись будь-коли; `private` — у сторінках
 * локальні дані; scope у тезі — щоб сторінка одного scope не підмінила іншу.
 */
export function sendCached(req: Request, res: Response, tag: string, body: unknown) {
  const etag = `"${tag}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'private, no-cache');
  if (req.headers['if-none-match'] === etag) {
    res.status(HttpStatus.NOT_MODIFIED).end();
    return;
  }
  res.json(body);
}
