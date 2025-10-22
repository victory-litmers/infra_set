import { DataSourceOptions } from 'typeorm';

export const directConnectionOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432, // Direct to DB
  username: 'postgres',
  password: 'postgres',
  database: 'test_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
};

export const pgbouncerConnectionOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 6433, // PgBouncer port
  username: 'postgres',
  password: 'postgres',
  database: 'test_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
  logging: false,
  extra: {
    max: 100, // Max connections in app pool
    min: 10,
    idleTimeoutMillis: 30000,
  },
};
