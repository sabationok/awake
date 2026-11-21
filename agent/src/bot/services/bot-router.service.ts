import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ExternalContextCreator, type ParamsFactory } from '@nestjs/core/helpers/external-context-creator';
import { BOT_ACTION_METADATA, BOT_CONTEXT_TYPE, BOT_METADATA, BOT_SCREEN_METADATA } from '../constants/bot-metadata';
import type { BotArgs } from '../types/bot-args.types';
import type { BotMenu } from '../types/bot-menu.types';
import type { BotNamespace } from '../types/bot-options.types';

type Handler = (args: BotArgs) => Promise<unknown>;

interface NamespaceRoutes {
  meta: BotNamespace;
  actions: Map<string, Handler>;
  screens: Map<string, Handler>;
}

/** Вбудованих param-типів (як @Body у HTTP) у бота немає: усе через createParamDecorator. */
const NO_PARAMS: ParamsFactory = { exchangeKeyForValue: () => undefined };

/**
 * Реєстр і виклик хендлерів `@Bot`. На старті збирає всі провайдери з `@Bot`, а виклик іде через
 * ExternalContextCreator з типом 'bot', тож на `@BotAction` працюють guards, pipes, interceptors і filters.
 * Транспорти (Telegram, SDUI, WS) лише кладуть сюди `{ bot, namespace, name, params, source, context }`.
 */
@Injectable()
export class BotRouterService implements OnModuleInit {
  private readonly _logger = new Logger(BotRouterService.name);
  /** bot → namespace → маршрути. Порядок — порядок провайдерів. */
  private readonly _bots = new Map<string, Map<string, NamespaceRoutes>>();

  constructor(
    private readonly _discovery: DiscoveryService,
    private readonly _scanner: MetadataScanner,
    private readonly _reflector: Reflector,
    private readonly _contextCreator: ExternalContextCreator,
  ) {}

  onModuleInit() {
    for (const wrapper of this._discovery.getProviders()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype || !wrapper.isDependencyTreeStatic()) continue;
      const meta = this._reflector.get<BotNamespace | undefined>(BOT_METADATA, metatype);
      if (meta) this._register(meta, instance as object);
    }
  }

  /** Namespace-и бота в порядку реєстрації: для меню команд і стартового екрана. */
  namespaces(bot: string): BotNamespace[] {
    return [...(this._bots.get(bot)?.values() ?? [])].map((routes) => routes.meta);
  }

  hasAction(bot: string, namespace: string, name: string): boolean {
    return this._routes(bot, namespace)?.actions.has(name) ?? false;
  }

  async action(args: BotArgs): Promise<void> {
    const handler = this._routes(args.bot, args.namespace)?.actions.get(args.name);
    if (!handler) throw new Error(`Unknown bot action ${args.bot}:${args.namespace}.${args.name}`);
    await handler(args);
  }

  /** Екран за шляхом; невідомий шлях — головний (''). Немає й головного — null. */
  async screen(args: BotArgs): Promise<BotMenu | null> {
    const screens = this._routes(args.bot, args.namespace)?.screens;
    const handler = screens?.get(args.name) ?? screens?.get('');
    return handler ? ((await handler(args)) as BotMenu) : null;
  }

  private _routes(bot: string, namespace: string): NamespaceRoutes | undefined {
    return this._bots.get(bot)?.get(namespace);
  }

  private _register(meta: BotNamespace, instance: object) {
    const namespaces = this._bots.get(meta.bot) ?? new Map<string, NamespaceRoutes>();
    this._bots.set(meta.bot, namespaces);
    if (namespaces.has(meta.namespace)) throw new Error(`Duplicate @Bot namespace ${meta.bot}:${meta.namespace}`);
    const routes: NamespaceRoutes = { meta, actions: new Map(), screens: new Map() };
    namespaces.set(meta.namespace, routes);

    const prototype = Object.getPrototypeOf(instance) as Record<string, (...args: unknown[]) => unknown>;
    for (const methodName of this._scanner.getAllMethodNames(prototype)) {
      const method = prototype[methodName];
      const action = this._reflector.get<string | undefined>(BOT_ACTION_METADATA, method);
      const screen = this._reflector.get<string | undefined>(BOT_SCREEN_METADATA, method);
      if (action === undefined && screen === undefined) continue;
      const handler = this._contextCreator.create(
        instance,
        method,
        methodName,
        ROUTE_ARGS_METADATA,
        NO_PARAMS,
        undefined,
        undefined,
        undefined,
        BOT_CONTEXT_TYPE,
      ) as Handler;
      if (action !== undefined) this._add(routes.actions, action, handler, meta, 'action');
      if (screen !== undefined) this._add(routes.screens, screen, handler, meta, 'screen');
    }
    this._logger.log(`${meta.bot}:${meta.namespace} — дій ${routes.actions.size}, екранів ${routes.screens.size}`);
  }

  private _add(map: Map<string, Handler>, key: string, handler: Handler, meta: BotNamespace, kind: string) {
    if (map.has(key)) throw new Error(`Duplicate bot ${kind} ${meta.bot}:${meta.namespace}.${key}`);
    map.set(key, handler);
  }
}
