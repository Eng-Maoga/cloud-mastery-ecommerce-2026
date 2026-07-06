import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const shouldConnect =
      (process.env.PRISMA_CONNECT_ON_INIT || '').toLowerCase() === 'true';

    if (!shouldConnect) {
      this.logger.log('Skipping Prisma startup connection (PRISMA_CONNECT_ON_INIT is not true).');
      return;
    }

    await this.$connect();
  }
}
