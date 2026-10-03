import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enterprise, User } from '../../entities';
import { EnterpriseService } from './enterprise.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Enterprise, User])],
  providers: [EnterpriseService],
  exports: [EnterpriseService],
})
export class EnterpriseModule {}
