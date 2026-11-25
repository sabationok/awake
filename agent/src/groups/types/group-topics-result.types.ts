/** Підсумок `ensureTopics`: скільки створено, які джерела не вдалося і чому топіки зараз неможливі (null — можливі). */
export interface GroupTopicsResult {
  created: string[];
  failed: string[];
  blocked: string | null;
}
