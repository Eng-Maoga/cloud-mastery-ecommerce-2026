import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from '../prisma.service';
import { BigQuery } from '@google-cloud/bigquery';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);
  private readonly bigQuery = new BigQuery();
  private readonly customersTable =
    process.env.BIGQUERY_CUSTOMERS_TABLE ||
    'pawait-data-hub.cloud_mastery.customers';

  constructor(private prisma: PrismaService) {}

  private getCustomerDateWindow() {
    return {
      gte: new Date('2026-06-29T00:00:00.000Z'),
      lt: new Date('2026-06-30T00:00:00.000Z'),
    };
  }

  async create(createCustomerDto: CreateCustomerDto) {
    if (await this.findByEmail(createCustomerDto.email)) {
      throw new ConflictException('Customer exist');
    }
    const customer = await this.prisma.customer.create({
      data: {
        firstName: createCustomerDto.firstName,
        lastName: createCustomerDto.lastName,
        email: createCustomerDto.email,
        phone: createCustomerDto.phone,
        address: createCustomerDto.address,
        city: createCustomerDto.city,
      },
    });
    return customer;
  }

  async findAll() {
    try {
      const [rows] = await this.bigQuery.query({
        query: `
          SELECT
            id,
            firstName,
            lastName,
            email,
            CAST(phone AS STRING) AS phone,
            address,
            city,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM \`${this.customersTable}\`
          ORDER BY created_at DESC
        `,
        location: process.env.BIGQUERY_LOCATION || 'US',
      });

      return (rows as Array<Record<string, unknown>>).map((row) => ({
        id: row.id ? String(row.id) : '',
        firstName: row.firstName ? String(row.firstName) : '',
        lastName: row.lastName ? String(row.lastName) : '',
        email: row.email ? String(row.email) : '',
        phone: row.phone ? String(row.phone) : '',
        address: row.address ? String(row.address) : '',
        city: row.city ? String(row.city) : '',
        createdAt:
          row.createdAt && typeof row.createdAt === 'object' && 'value' in row.createdAt
            ? String((row.createdAt as { value: unknown }).value)
            : (row.createdAt ? String(row.createdAt) : null),
        updatedAt:
          row.updatedAt && typeof row.updatedAt === 'object' && 'value' in row.updatedAt
            ? String((row.updatedAt as { value: unknown }).value)
            : (row.updatedAt ? String(row.updatedAt) : null),
      }));
    } catch (error) {
      this.logger.error(
        `BigQuery customer read failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return [];
    }
  }

  findOne(id: string) {
    const customer = this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException();
    }
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException();
    }
    if (updateCustomerDto.email != customer.email) {
      if (await this.findByEmail(updateCustomerDto.email)) {
        throw new ConflictException('Customer exist');
      }
    }
    const updatedData = this.prisma.customer.update({
      where: { id },
      data: {  
        firstName: updateCustomerDto.firstName,
        lastName: updateCustomerDto.lastName,
        email: updateCustomerDto.email,
        phone: updateCustomerDto.phone,
        address: updateCustomerDto.address,
        city: updateCustomerDto.city},
    });
    return updatedData;
  }

  async remove(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException();
    }
    const deletedData = this.prisma.customer.delete({
      where: { id },
    });
    return deletedData;
  }

  async findByEmail(email: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { email },
    });

    return customer;
  }
}
