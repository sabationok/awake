import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';

/** Де лежить порядок: службовий запис налаштувань, не налаштування модуля (на сторінці «Налаштування» його немає). */
const ORDER_MODULE = 'host';
const ORDER_KEY = 'moduleOrder';

/**
 * Порядок модулів у бічному меню, спільний для Mac-аппки і вебу: власник перетягує модулі в «Упорядкувати», сервер
 * зберігає id через кому. Модулі, яких у збереженому порядку немає (нові), стають у кінець у порядку реєстрації.
 */
@Injectable()
export class ModuleOrderService {
  constructor(private readonly _settings: SettingsService) {}

  get(): string[] {
    const raw = this._settings.get(ORDER_MODULE, ORDER_KEY);
    return typeof raw === 'string' && raw ? raw.split(',') : [];
  }

  set(ids: string[]) {
    this._settings.set(ORDER_MODULE, ORDER_KEY, ids.join(','));
  }

  /** `items` у збереженому порядку; незгадані — після, у своєму порядку. */
  sort<T extends { id: string }>(items: T[]): T[] {
    const order = this.get();
    const rank = (id: string) => {
      const index = order.indexOf(id);
      return index === -1 ? order.length + items.findIndex((item) => item.id === id) : index;
    };
    return [...items].sort((a, b) => rank(a.id) - rank(b.id));
  }
}
