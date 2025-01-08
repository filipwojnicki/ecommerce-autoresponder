import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CodeService } from './services';
import { Code } from './models';

@Module({
  imports: [SequelizeModule.forFeature([Code])],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
