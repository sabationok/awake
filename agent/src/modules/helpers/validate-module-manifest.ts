import type { MacModule } from '../types/mac-module';

/**
 * Перевірка задекларованих частин маніфесту на старті: помилка тут зупиняє запуск агента. Перевіряється лише те, що
 * відоме без запуску модуля (сповіщення і статистика); сторінки й налаштування з getter-ів сюди не входять.
 */
export function validateModuleManifest(module: MacModule): void {
  const fail = (reason: string): never => {
    throw new Error(`Маніфест модуля "${module.id}": ${reason}`);
  };
  const { notifications, stats } = module;
  if (notifications) {
    if (notifications.id !== module.id) fail(`джерело сповіщень "${notifications.id}" має називатись як модуль`);
    const types = notifications.events.map((event) => event.type);
    if (new Set(types).size !== types.length) fail('тип події сповіщень задекларовано двічі');
  }
  if (!stats) return;
  if (!stats.page.startsWith(module.id)) fail(`сторінка статистики "${stats.page}" має починатись з id модуля`);
  const chartIds = stats.charts.map((chart) => chart.id);
  if (new Set(chartIds).size !== chartIds.length) fail('id графіка статистики задекларовано двічі');
  for (const chart of stats.charts) {
    if (!chart.id.startsWith(`${stats.page}-`)) fail(`id графіка "${chart.id}" має починатись з id сторінки "${stats.page}"`);
    const namespace = stats.namespaces.find((item) => item.id === chart.namespace);
    if (!namespace) {
      fail(`графік "${chart.id}" читає незадекларований namespace "${chart.namespace}"`);
      continue;
    }
    const declared = new Set((chart.by === 'value' ? namespace.values : namespace.statuses).map((item) => item.key));
    const unknown = (chart.keys ?? []).find((key) => !declared.has(key));
    if (unknown !== undefined) fail(`графік "${chart.id}" показує незадекларований ключ "${unknown}"`);
  }
}
