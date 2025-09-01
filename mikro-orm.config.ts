import { defineConfig } from '@mikro-orm/postgresql';
import { RequestLog } from './src/server/entities/RequestLog';

export default defineConfig({
  entities: [RequestLog],
  clientUrl: process.env.DATABASE_URL,
  driverOptions: {
    connection: {
      ssl: { rejectUnauthorized: false }
    }
  },
  debug: process.env.NODE_ENV !== 'production',
  migrations: {
    path: './migrations',
    tableName: 'mikro_orm_migrations',
    transactional: true,
    emit: 'ts',
    glob: '!(*.d).{js,ts}',
  },
});
