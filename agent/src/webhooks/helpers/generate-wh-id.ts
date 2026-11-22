import { randomBytes } from 'node:crypto';

/** `mt_id` нового вебхука: генерує агент, webhooxy зареєструє його на першому запиті. */
export function generateWhId(): string {
  return `wh_${randomBytes(12).toString('base64url')}`;
}
