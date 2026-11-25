/** Топік групи за джерелом або за thread id; потрібне хоча б одне з двох. */
export class GroupTopicRefDto {
  groupId!: number;
  source?: string;
  threadId?: number;
}
