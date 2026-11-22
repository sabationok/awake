import type { UiChart } from '@awake/contracts';
import type { SessionsPeriod } from '../../../sessions/types/sessions-history.types';
import type { SessionsPeriodLabel } from './sessions-period-row';

/** Два графіки періоду: кількість сесій і час не спати (секунди), по бакету на день, тиждень чи місяць. */
export function sessionsPeriodCharts(periods: SessionsPeriod[], unit: SessionsPeriodLabel): UiChart[] {
  return [
    {
      id: `${unit}-count-chart`,
      type: 'chart',
      title: 'Сесій',
      unit,
      tone: 'accent',
      format: 'count',
      points: periods.map((period) => ({ start: period.start.toISOString(), value: period.count })),
    },
    {
      id: `${unit}-time-chart`,
      type: 'chart',
      title: 'Час',
      unit,
      tone: 'green',
      format: 'duration',
      points: periods.map((period) => ({ start: period.start.toISOString(), value: period.seconds })),
    },
  ];
}
