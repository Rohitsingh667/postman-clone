import { MikroORM, EntityManager } from '@mikro-orm/core';
import config from '../../mikro-orm.config';

let ormInstance: MikroORM | null = null;
let schemaSyncDone = false;

export async function getOrm(): Promise<MikroORM> {
  if (!ormInstance) {
    ormInstance = await MikroORM.init(config);
  }
  if (!schemaSyncDone) {
    try {
      const generator = ormInstance.getSchemaGenerator();
      await generator.updateSchema();
      schemaSyncDone = true;
    } catch (e) {
      console.error('Schema sync error', e);
    }
  }
  return ormInstance;
}

export async function getEm(): Promise<EntityManager> {
  const orm = await getOrm();
  return orm.em.fork({ clear: true });
}
