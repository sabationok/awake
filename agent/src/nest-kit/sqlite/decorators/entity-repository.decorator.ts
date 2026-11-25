// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite
import { Injectable, type Type } from '@nestjs/common';

const ENTITY_REPOSITORY = Symbol('SQLITE_ENTITY_REPOSITORY');

/** Репозиторій entity: `class XRepository extends SqliteRepository<...>`. Реєструється у providers модуля як звичайний провайдер. */
export function EntityRepository(entity: Type<unknown>): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ENTITY_REPOSITORY, entity, target);
    Injectable()(target);
  };
}

export function getRepositoryEntity(target: Function): Type<unknown> {
  const entity = Reflect.getMetadata(ENTITY_REPOSITORY, target) as Type<unknown> | undefined;
  if (!entity) throw new Error(`${target.name} has no @EntityRepository(Entity)`);
  return entity;
}
