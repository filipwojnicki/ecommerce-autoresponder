import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CodeService } from './services';
import { Code, CodeOffer } from './models';

@Module({
  imports: [SequelizeModule.forFeature([CodeOffer, Code])],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
