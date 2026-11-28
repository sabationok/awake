import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MacBridgeService } from '../../../mac-bridge/services/mac-bridge.service';
import { CreateTrustedNetworkDto } from '../../dto/create-trusted-network.dto';
import { TrustedNetworksRepository } from '../../repositories/trusted-networks.repository';

/** SSID довжиною більше за 32 байти Wi-Fi не має: довше — сміття, не пишемо. */
const MAX_SSID_BYTES = 32;

/**
 * Довірені мережі Wi-Fi: лише в них агент приймає запити не з цього Mac і публікує локальну адресу.
 * Список у SQLite; Mac шле лише SSID поточної мережі, а чи вона довірена, вирішує агент.
 */
@Injectable()
export class TrustedNetworksService {
  /** Список змінився: перебудувати сторінки, посилання сполучення, знімок для аппки. */
  readonly changed$ = new Subject<void>();
  private _ssids: ReadonlySet<string>;

  constructor(
    private readonly _repository: TrustedNetworksRepository,
    private readonly _bridge: MacBridgeService,
  ) {
    this._ssids = new Set(this.list());
  }

  /** SSID у порядку додавання. */
  list(): string[] {
    return this._repository.findMany({}, { select: ['ssid'], order: { addedAt: 'ASC', ssid: 'ASC' } }).map((network) => network.ssid);
  }

  isTrusted(ssid: string | null | undefined): boolean {
    return !!ssid && this._ssids.has(ssid);
  }

  /** Mac зараз у довіреній мережі (за останнім станом Mac, SSID дає помічник). */
  get isCurrentTrusted(): boolean {
    return this.isTrusted(this._bridge.state?.ssid);
  }

  add(ssid: string) {
    if (!ssid || Buffer.byteLength(ssid) > MAX_SSID_BYTES) return;
    const dto: CreateTrustedNetworkDto = { ssid, addedAt: new Date().toISOString() };
    if (this._repository.upsert(dto, { conflict: ['ssid'] })) this._reload();
  }

  remove(ssid: string) {
    if (this._repository.delete({ ssid })) this._reload();
  }

  private _reload() {
    this._ssids = new Set(this.list());
    this.changed$.next();
  }
}
