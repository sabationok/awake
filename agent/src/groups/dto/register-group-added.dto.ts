import type { GroupBotRights, GroupProviderId } from '@awake/contracts';

/** Бота додали в групу. `byOwner` вирішує конектор (він знає, хто власник); ядро лише довіряє цьому. */
export class RegisterGroupAddedDto {
  provider!: GroupProviderId;
  externalId!: string;
  title!: string;
  addedBy!: string;
  byOwner!: boolean;
  botRights!: GroupBotRights;
  topicsEnabled!: boolean;
}
