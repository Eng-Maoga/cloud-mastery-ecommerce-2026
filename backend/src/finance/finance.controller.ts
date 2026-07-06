import { Controller, Get } from '@nestjs/common';
import { FinanceService } from './finance.service';

@Controller({
  path: 'finance-products',
  version: '1',
})
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  findAll() {
    return this.financeService.findAll();
  }
}
