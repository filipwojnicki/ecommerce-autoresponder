import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { MysqlSequelizeConfigService } from './services';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MysqlSequelizeConfigService,
    }),
  ],
})
export class DatabaseModule {}
