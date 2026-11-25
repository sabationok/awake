import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import type { Subscription } from 'rxjs';
import { GROUPS_STAT, GroupsBindingService, GroupsService } from '../../groups';
import { TelegramBotService } from '../services/telegram-bot/telegram-bot.service';
import {
  GROUP_QUEUE_LIMIT,
  GROUP_QUEUE_TTL_MS,
  GROUP_RATE_WINDOW_MS,
  GROUP_RETRY_AFTER_CAP_MS,
  GROUP_SEND_ATTEMPTS,
} from './constants/telegram-group-delivery';
import type { DeliverGroupMessageDto } from './dto/deliver-group-message.dto';
import type { GroupDeliveryResult } from './types/telegram-send-result.types';

interface QueueItem {
  dto: DeliverGroupMessageDto;
  done: (result: GroupDeliveryResult) => void;
  enqueuedAt: number;
}

/**
 * Черга однієї групи: що чекає, коли пішли останні прийняті повідомлення, до якого часу Telegram просив мовчати.
 * `closed` — групу відв'язали або бот вийшов: черга більше нічого не шле.
 */
interface ChatQueue {
  chatId: string;
  items: QueueItem[];
  sentAt: number[];
  blockedUntil: number;
  running: boolean;
  closed: boolean;
}

/**
 * Сповіщення в групу під ліміт конектора: не більше `manifest.limits.messagesPerMinute` прийнятих повідомлень на
 * групу за хвилину (невдалі спроби у вікно не йдуть). `429` — чекаємо `retry_after`, але не довше
 * `GROUP_RETRY_AFTER_CAP_MS`: довше — сповіщення `failed`, і так усі наступні, поки заборона не мине. Сповіщення
 * чекає в черзі не довше `GROUP_QUEUE_TTL_MS`. Черга обмежена: найстаріше випадає з лічильником. Топік видалили
 * руками — позначаємо видаленим, один раз створюємо новий і шлемо туди. `failed` і `dropped` той, хто кликав,
 * відправляє запасним шляхом. Запис черги зникає, коли вона порожня і їй нема чого пам'ятати (вікно ліміту
 * спливло), і одразу, коли групу відв'язано. Приватний чат іде повз цю чергу.
 */
@Injectable()
export class TelegramGroupDeliveryService implements OnModuleInit, OnModuleDestroy {
  private readonly _logger = new Logger(TelegramGroupDeliveryService.name);
  private readonly _queues = new Map<string, ChatQueue>();
  private _subscription: Subscription | null = null;

  constructor(
    private readonly _bot: TelegramBotService,
    private readonly _groups: GroupsService,
    private readonly _binding: GroupsBindingService,
  ) {}

  onModuleInit() {
    this._subscription = this._groups.changed$.subscribe(() => this._closeUnbound());
  }

  onModuleDestroy() {
    this._subscription?.unsubscribe();
  }

  /** Ставить сповіщення в чергу групи і чекає його долі. Ніколи не кидає. */
  deliver(dto: DeliverGroupMessageDto): Promise<GroupDeliveryResult> {
    this._sweep();
    const queue = this._queue(dto.target.chatId);
    return new Promise<GroupDeliveryResult>((done) => {
      if (queue.items.length >= GROUP_QUEUE_LIMIT) {
        queue.items.shift()?.done('dropped');
        this._groups.count(GROUPS_STAT.dropped);
        this._logger.warn('Черга групи повна: найстаріше сповіщення відкинуто');
      }
      queue.items.push({ dto, done, enqueuedAt: Date.now() });
      if (!queue.running) {
        void this._drain(queue).catch(() => {
          // Черга не змогла працювати (конектора немає): усе, що чекало, піде запасним шляхом.
          for (const item of queue.items.splice(0)) this._finish(item, 'failed');
        });
      }
    });
  }

  private async _drain(queue: ChatQueue) {
    queue.running = true;
    try {
      for (;;) {
        // Спершу слот, потім елемент: поки чекали, найстаріше могло випасти, а чергу могли закрити.
        const limit = this._limit(queue.items[0]);
        if (limit === null) break;
        const ready = await this._waitForSlot(queue, limit);
        const item = queue.items.shift();
        if (!item) break;
        const result = ready && !this._expired(item) ? await this._send(queue, item, limit).catch(() => 'failed' as const) : 'failed';
        this._finish(item, result);
      }
    } finally {
      queue.running = false;
      this._release(queue);
    }
  }

  private async _send(queue: ChatQueue, item: QueueItem, limit: number): Promise<'sent' | 'failed'> {
    const { dto } = item;
    let threadId = dto.target.threadId;
    let recreated = false;
    for (let attempt = 0; attempt < GROUP_SEND_ATTEMPTS; attempt += 1) {
      if (attempt > 0 && (!(await this._waitForSlot(queue, limit)) || this._expired(item))) return 'failed';
      if (queue.closed) return 'failed';
      const result = await this._bot.notify(dto.html, { chatId: dto.target.chatId, threadId });
      if (result.ok) {
        // У вікно ліміту йде лише прийняте повідомлення.
        queue.sentAt.push(Date.now());
        return 'sent';
      }
      if (result.reason === 'rateLimited') {
        this._groups.count(GROUPS_STAT.rateLimited);
        queue.blockedUntil = Date.now() + result.retryAfterMs;
        continue;
      }
      if (result.reason !== 'threadNotFound' || threadId === undefined || recreated) return 'failed';
      recreated = true;
      const next = await this._binding.recreateTopic({ source: dto.source, staleThreadId: threadId });
      if (next === null) return 'failed';
      threadId = next;
    }
    return 'failed';
  }

  /**
   * Чекає, поки мине `retry_after` і у вікні ліміту з'явиться місце. false — Telegram просить мовчати довше, ніж
   * черга згодна чекати: слати зараз не можна, сповіщення йде запасним шляхом.
   */
  private async _waitForSlot(queue: ChatQueue, limit: number): Promise<boolean> {
    for (;;) {
      const now = Date.now();
      if (queue.blockedUntil - now > GROUP_RETRY_AFTER_CAP_MS) return false;
      queue.sentAt = queue.sentAt.filter((at) => now - at < GROUP_RATE_WINDOW_MS);
      const freeAt = queue.sentAt.length >= limit ? queue.sentAt[queue.sentAt.length - limit] + GROUP_RATE_WINDOW_MS : now;
      const waitMs = Math.max(queue.blockedUntil, freeAt) - now;
      if (waitMs <= 0) return true;
      await delay(waitMs, undefined, { ref: false });
    }
  }

  private _expired(item: QueueItem): boolean {
    return Date.now() - item.enqueuedAt >= GROUP_QUEUE_TTL_MS;
  }

  /** Ліміт конектора групи з його маніфесту; null — черга порожня. */
  private _limit(item: QueueItem | undefined): number | null {
    if (!item) return null;
    return Math.max(1, this._groups.requireProvider(item.dto.target.provider).manifest.limits.messagesPerMinute);
  }

  private _queue(chatId: string): ChatQueue {
    let queue = this._queues.get(chatId);
    if (!queue || queue.closed) {
      queue = { chatId, items: [], sentAt: [], blockedUntil: 0, running: false, closed: false };
      this._queues.set(chatId, queue);
    }
    return queue;
  }

  /**
   * Порожня черга зникає, щойно їй нема чого пам'ятати: вікно ліміту спливло і заборона Telegram минула (або її
   * закрили). Поки вікно живе, запис лишається, інакше рідкі сповіщення обходили б ліміт.
   */
  private _release(queue: ChatQueue) {
    if (queue.running || queue.items.length > 0 || this._queues.get(queue.chatId) !== queue) return;
    const now = Date.now();
    const idle = queue.blockedUntil <= now && !queue.sentAt.some((at) => now - at < GROUP_RATE_WINDOW_MS);
    if (queue.closed || idle) this._queues.delete(queue.chatId);
  }

  /** Прибирає черги, що відпрацювали: викликається на кожне нове сповіщення. */
  private _sweep() {
    for (const queue of [...this._queues.values()]) this._release(queue);
  }

  /** Групу відв'язали або бот вийшов: її черга закривається, усе, що чекало, іде запасним шляхом. */
  private _closeUnbound() {
    const bound = this._groups.boundGroup();
    const keep = bound && bound.leftAt === null ? bound.externalId : null;
    for (const queue of [...this._queues.values()]) {
      if (queue.chatId === keep) continue;
      queue.closed = true;
      for (const item of queue.items.splice(0)) this._finish(item, 'failed');
      this._release(queue);
    }
  }

  /** Доля сповіщення відома: лічильник `groups.events` (`sent` / `failed`) і відповідь тому, хто чекав. */
  private _finish(item: QueueItem, result: 'sent' | 'failed') {
    this._groups.count(result === 'sent' ? GROUPS_STAT.sent : GROUPS_STAT.failed);
    item.done(result);
  }
}
