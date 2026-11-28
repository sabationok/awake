import type { GroupCapability, GroupProviderId } from '@macontrol/contracts';

export class GroupCapabilityDto {
  provider!: GroupProviderId;
  capability!: GroupCapability;
}
