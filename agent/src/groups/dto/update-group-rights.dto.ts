import type { GroupBotRights } from '@macontrol/contracts';
import { GroupRefDto } from './group-ref.dto';

export class UpdateGroupRightsDto extends GroupRefDto {
  botRights!: GroupBotRights;
  /** Не задано — не міняти. */
  topicsEnabled?: boolean;
  title?: string;
}
