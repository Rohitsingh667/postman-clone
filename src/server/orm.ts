import { MikroORM, EntityManager, PostgreSqlDriver } from '@mikro-orm/postgresql';
import config from '../../mikro-orm.config';

let ormInstance: MikroORM<PostgreSqlDriver> | null = null;
let schemaSyncDone = false;

export async function getOrm() {
  if (!ormInstance) {
    ormInstance = await MikroORM.init<PostgreSqlDriver>(config);
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
