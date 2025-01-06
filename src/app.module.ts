import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { ProvidersModule } from './providers/providers.module';
import { DatabaseModule } from './database/database.module';
import config from './config/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      validationSchema: Joi.object({
        port: Joi.number().default(3000),
        database: {
          host: Joi.string().default('localhost'),
          port: Joi.number().default(3306),
          username: Joi.string(),
          password: Joi.string(),
          database: Joi.string(),
        },
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ProvidersModule,
    DatabaseModule,
  ],
})
export class AppModule {}
