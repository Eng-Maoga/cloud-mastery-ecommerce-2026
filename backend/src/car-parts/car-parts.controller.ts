import { Controller, Get } from '@nestjs/common';
import { CarPartsService } from './car-parts.service';

@Controller({
  path: 'car-parts',
  version: '1',
})
export class CarPartsController {
  constructor(private readonly carPartsService: CarPartsService) {}

  @Get()
  findAll() {
    return this.carPartsService.findAll();
  }
}
