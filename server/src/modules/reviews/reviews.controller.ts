import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { UserRole } from '../../entities/user.entity';

@ApiTags('评价')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('tasks/:id/review')
  @Roles(UserRole.WORKER, UserRole.ENTERPRISE)
  @ApiOperation({ summary: '任务互评（结算后）' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.reviews.create(user, id, Number(body.rating), body.comment);
  }

  @Get('users/:id/reviews')
  @ApiOperation({ summary: '用户收到的评价' })
  forUser(@Param('id', ParseIntPipe) id: number) {
    return this.reviews.forUser(id);
  }
}
