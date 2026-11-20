'use client';
import { Button } from '@/components/button';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { LogsGroup } from '../components/logs-group';
import { MacStatusGroup } from '../components/mac-status-group';
import { SessionControlsGroup } from '../components/session-controls-group';
import { SessionsGroup } from '../components/sessions-group';
import { useLocalAgent } from '../hooks/use-local-agent';
import { useNow } from '../hooks/use-now';

/** Пульт, який роздає агент на Mac: стан, керування, історія і журнал з SQLite. */
export function LocalDashboardPage() {
  const now = useNow();
  const agent = useLocalAgent();

  if (agent.pairing === 'checking') return <PageFrame title="Awake">{null}</PageFrame>;

  if (agent.pairing !== 'paired') {
    return (
      <PageFrame title="Awake">
        <Group
          footer={
            agent.pairing === 'failed'
              ? 'Посилання застаріло. Відкрий пульт ще раз із дашборду: код діє кілька хвилин і лише один раз.'
              : 'Цей пристрій ще не сполучений з Mac. Відкрий пульт із дашборду, поки ти в довіреній Wi-Fi.'
          }
        >
          <KeyValueRow label="Потрібне сполучення" />
        </Group>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Awake"
      accessory={
        <Button variant="plain" className="mb-1 h-8 px-3 text-[13px]" onClick={agent.forget}>
          Забути пристрій
        </Button>
      }
    >
      <MacStatusGroup state={agent.state} now={now} />
      <SessionControlsGroup active={!!agent.state?.active} disabled={!agent.state} onCommand={agent.sendCommand} />
      <SessionsGroup sessions={agent.sessions} now={now} />
      <LogsGroup logs={agent.logs} />
    </PageFrame>
  );
}
