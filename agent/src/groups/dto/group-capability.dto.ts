import type { GroupCapability, GroupProviderId } from '@awake/contracts';

export class GroupCapabilityDto {
  provider!: GroupProviderId;
  capability!: GroupCapability;
}
