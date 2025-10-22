// database.config.ts
import { DataSourceOptions } from 'typeorm';

export const masterDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5440,
  username: 'postgres',
  password: 'postgres',
  database: 'main_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
};

export const slave1DataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5441, // slave 1
  username: 'postgres',
  password: 'postgres',
  database: 'main_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
};

export const slave2DataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5442, // slave 2
  username: 'postgres',
  password: 'postgres',
  database: 'main_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false,
};
