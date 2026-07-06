import {
  Module,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './response.interceptor';
import { PrismaService } from './prisma.service';

import { CustomerService } from './customer/customer.service';
import { CustomerModule } from './customer/customer.module';
import { ProductService } from './product/product.service';
import { ProductModule } from './product/product.module';
import { OrderService } from './order/order.service';
import { OrderModule } from './order/order.module';
import { FinanceModule } from './finance/finance.module';
import { CarPartsModule } from './car-parts/car-parts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    CustomerModule,
    ProductModule,
    OrderModule,
    FinanceModule,
    CarPartsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    CustomerService,
    ProductService,
    OrderService,
    PrismaService,
  ],
})
export class AppModule {}