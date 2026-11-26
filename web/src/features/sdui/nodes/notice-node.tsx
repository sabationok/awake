import type { UiNotice } from '@awake/contracts';
import { Notice } from '@/components/notice';
import type { NodeProps } from '../sdui.types';
import { SduiIcon } from './sdui-icon';

/** Сповіщення сторінки; хрестик шле `dismiss` серверу, сам рендерер нічого не запам'ятовує. */
export function NoticeNode({ node, onEvent }: NodeProps<UiNotice>) {
  const dismiss = node.dismiss;
  return (
    <Notice
      variant={node.variant}
      icon={node.icon ? <SduiIcon icon={node.icon} /> : undefined}
      title={node.title}
      text={node.text}
      sticky={node.sticky}
      onClose={dismiss ? () => void onEvent({ type: 'action', action: dismiss }).catch(() => undefined) : undefined}
    />
  );
}
