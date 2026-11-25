import type { GroupCapability, GroupProviderManifest } from '@awake/contracts';
import { GROUP_CAPABILITY_LABEL } from '../constants/groups-capabilities';

/** Причина сірого елемента: конектор не задекларував можливість у своєму маніфесті. */
export function capabilityReason(provider: GroupProviderManifest, capability: GroupCapability): string {
  return `Конектор ${provider.title} не підтримує: ${GROUP_CAPABILITY_LABEL[capability].toLowerCase()}`;
}
