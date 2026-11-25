import type { GroupTopicEntity } from '../entities/group-topic.entity';
import type { GroupTopicRow, GroupTopicSource } from '../types/group-topic-row.types';

/** Рядок на кожне джерело сповіщень: чи є в нього топік, у якому він стані і чи ввімкнений його перемикач. */
export function groupTopicRows(sources: GroupTopicSource[], topics: GroupTopicEntity[], isEnabled: (source: string) => boolean): GroupTopicRow[] {
  return sources.map((source) => {
    const topic = topics.find((item) => item.source === source.id);
    return {
      source: source.id,
      label: source.label,
      viaMac: source.viaMac === true,
      enabled: isEnabled(source.id),
      topic: topic?.name ?? null,
      state: !topic ? 'missing' : topic.closedAt !== null ? 'closed' : 'active',
    };
  });
}

export const GROUP_TOPIC_STATE_LABEL: Record<GroupTopicRow['state'], string> = {
  active: 'активний',
  closed: 'закритий',
  missing: 'не створено',
};

/** Стан рядка словами: вимкнений перемикач важливіший за стан самого топіка. */
export function groupTopicStateText(row: GroupTopicRow): string {
  if (!row.enabled) return row.viaMac ? 'вимкнено: у приватний чат' : 'вимкнено: у General';
  return GROUP_TOPIC_STATE_LABEL[row.state];
}
