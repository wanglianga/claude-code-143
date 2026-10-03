import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles, RoleGuard } from '../auth/auth.guard';
import { ReviewsService } from './reviews.service';

@Controller('api/reviews')
@UseGuards(AuthGuard, RoleGuard)
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('assignments/:id')
  create(
    @Param('id') id: string,
    @Body() dto: { rating: number; comment?: string },
    @Req() req: any,
  ) {
    return this.reviews.create(req.user, Number(id), Number(dto.rating), dto.comment);
  }

  @Get('target/:role/:id')
  list(@Param('role') role: string, @Param('id') id: string) {
    return this.reviews.listForTarget(role, Number(id));
  }
}
