import type { UiChart, UiChartPoint } from '@awake/contracts';
import { FlexBox, FlexRow } from '@/components/flex';
import { TONE_BG } from '@/components/status-dot';
import { cn } from '@/lib/cn';
import type { NodeProps } from '../sdui.types';

const LABEL: Record<UiChart['unit'], Intl.DateTimeFormatOptions> = {
  minute: { hour: '2-digit', minute: '2-digit' },
  hour: { hour: 'numeric' },
  day: { weekday: 'narrow' },
  week: { day: 'numeric', month: '2-digit' },
  month: { month: 'short' },
};

const round = (value: number, digits: number) => String(Math.round(value * 10 ** digits) / 10 ** digits);

/** Підпис значення за форматом шкали: секунди → «3 год», байти → «117 МБ», відсотки, дробове число. */
const FORMAT: Record<NonNullable<UiChart['format']>, (value: number) => string> = {
  count: (value) => round(value, 1),
  duration: (value) => (value >= 3600 ? `${round(value / 3600, 1)} год` : `${Math.round(value / 60)} хв`),
  bytes: (value) => (value >= 1024 ** 3 ? `${round(value / 1024 ** 3, 1)} ГБ` : `${round(value / 1024 ** 2, 1)} МБ`),
  percent: (value) => `${round(value, 1)} %`,
  number: (value) => round(value, 2),
};

function formatValue(value: number, format: UiChart['format']): string {
  return FORMAT[format ?? 'count'](value);
}

/** Точки → стовпчики за початком бакета, сегменти в порядку серій. */
function toBars(points: UiChartPoint[]) {
  const bars = new Map<string, UiChartPoint[]>();
  for (const point of points) bars.set(point.start, [...(bars.get(point.start) ?? []), point]);
  return [...bars.entries()].sort(([a], [b]) => a.localeCompare(b));
}

/**
 * @ui ChartNode
 * @spec Простий стовпчиковий графік вебу: стовпчики з div-ів, stacked за серіями, підпис бакета під кожним, максимум зверху.
 * Повний графік з осями — у Mac-аппці (BarHistoryChart).
 * @keywords chart, bar, histogram, timeline, stacked
 */
export function ChartNode({ node }: NodeProps<UiChart>) {
  const bars = toBars(node.points);
  const totals = bars.map(([, segments]) => segments.reduce((sum, point) => sum + point.value, 0));
  const max = Math.max(...totals, node.limit ?? 0, 0) || 1;
  const series = [...new Set(node.points.map((point) => point.series ?? ''))];
  const tone = (name: string) => TONE_BG[node.tones?.[name] ?? node.tone ?? 'accent'];
  return (
    <FlexBox gap="sm" className="px-4 py-3">
      <FlexRow justify="between">
        <FlexRow gap="md">
          <span className="text-[15px] font-medium text-label">{node.title}</span>
          {series.length > 1 &&
            series.map((name) => (
              <FlexRow key={name} gap="xs">
                <span className={cn('size-2 rounded-sm', tone(name))} />
                <span className="text-xs text-secondary">{name}</span>
              </FlexRow>
            ))}
        </FlexRow>
        <span className="text-xs text-secondary">{formatValue(max, node.format)}</span>
      </FlexRow>
      <FlexRow gap="xs" align="end" className="h-28">
        {bars.map(([start, segments], index) => (
          <FlexBox key={start} gap="xs" align="center" justify="end" className="h-full min-w-0 flex-1">
            <FlexBox
              gap="none"
              justify="end"
              title={`${new Date(start).toLocaleDateString('uk-UA')}: ${formatValue(totals[index], node.format)}`}
              className="w-full max-w-6 overflow-hidden rounded"
              style={{ height: `${(totals[index] / max) * 100}%` }}
            >
              {[...segments].reverse().map((point) => (
                <div key={point.series ?? ''} className={tone(point.series ?? '')} style={{ flexGrow: point.value }} />
              ))}
            </FlexBox>
            <span className="text-[11px] text-secondary">{new Date(start).toLocaleString('uk-UA', LABEL[node.unit])}</span>
          </FlexBox>
        ))}
      </FlexRow>
    </FlexBox>
  );
}
