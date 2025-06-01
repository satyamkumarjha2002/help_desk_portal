import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrioritiesController } from './priorities.controller';
import { PrioritiesService } from './priorities.service';
import { Priority } from '../../entities/priority.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Priority, User])],
  controllers: [PrioritiesController],
  providers: [PrioritiesService],
  exports: [PrioritiesService],
})
export class PrioritiesModule {} 