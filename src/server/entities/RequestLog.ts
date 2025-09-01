import { EntitySchema } from '@mikro-orm/core';

export interface RequestLogEntity {
  id: string;
  method: string;
  url: string;
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  status: number;
  responseHeaders?: Record<string, string> | null;
  responseBody?: string | null;
  durationMs: number;
  createdAt: Date;
}

export const RequestLog = new EntitySchema<RequestLogEntity>({
  name: 'RequestLog',
  tableName: 'request_logs',
  properties: {
    id: { type: 'string', primary: true },
    method: { type: 'string' },
    url: { type: 'string' },
    requestHeaders: { type: 'json', nullable: true },
    requestBody: { type: 'text', nullable: true },
    status: { type: 'number' },
    responseHeaders: { type: 'json', nullable: true },
    responseBody: { type: 'text', nullable: true },
    durationMs: { type: 'number', default: 0 },
    createdAt: { type: 'date', onCreate: () => new Date() },
  },
});
