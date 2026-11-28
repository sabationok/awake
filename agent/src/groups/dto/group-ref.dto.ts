import type { GroupProviderId } from '@macontrol/contracts';

/** Група за ключем провайдера. */
export class GroupRefDto {
  provider!: GroupProviderId;
  externalId!: string;
}
