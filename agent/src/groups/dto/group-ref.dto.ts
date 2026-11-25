import type { GroupProviderId } from '@awake/contracts';

/** Група за ключем провайдера. */
export class GroupRefDto {
  provider!: GroupProviderId;
  externalId!: string;
}
