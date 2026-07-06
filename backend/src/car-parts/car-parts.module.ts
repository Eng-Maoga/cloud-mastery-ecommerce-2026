import { Module } from '@nestjs/common';
import { CarPartsController } from './car-parts.controller';
import { CarPartsService } from './car-parts.service';

@Module({
  controllers: [CarPartsController],
  providers: [CarPartsService],
  exports: [CarPartsService],
})
export class CarPartsModule {}
