import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review, Assignment, Job } from '../../entities';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Assignment, Job])],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule {}
