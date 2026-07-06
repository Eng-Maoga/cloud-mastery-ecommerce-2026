import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { BigQuery } from '@google-cloud/bigquery';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private readonly bigQuery = new BigQuery();
  private readonly productsTable =
    process.env.BIGQUERY_PRODUCTS_TABLE ||
    'pawait-data-hub.cloud_mastery.products';

  constructor(private prisma: PrismaService) {}

  private parseBigQueryTable() {
    const parts = this.productsTable.split('.');
    if (parts.length !== 3) {
      throw new Error(
        `Invalid BIGQUERY_PRODUCTS_TABLE format: ${this.productsTable}. Expected <project>.<dataset>.<table>`,
      );
    }

    return {
      projectId: parts[0],
      datasetId: parts[1],
      tableId: parts[2],
    };
  }

  private async getBigQueryColumns() {
    const { projectId, datasetId, tableId } = this.parseBigQueryTable();

    const [rows] = await this.bigQuery.query({
      query: `
        SELECT column_name
        FROM \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = @tableName
      `,
      params: { tableName: tableId },
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    const columns = new Set<string>();
    for (const row of rows as Array<{ column_name: string }>) {
      columns.add(row.column_name);
    }
    return columns;
  }

  private pickExpression(columns: Set<string>, candidates: string[], alias: string) {
    const found = candidates.find((column) => columns.has(column));
    if (!found) {
      return `NULL AS ${alias}`;
    }
    return `${found} AS ${alias}`;
  }

  private async getProductsFromBigQuery(limit?: number, id?: string) {
    const columns = await this.getBigQueryColumns();
    const selectId = this.pickExpression(columns, ['id'], 'id');
    const selectName = this.pickExpression(columns, ['name', 'product_name', 'title'], 'name');
    const selectDescription = this.pickExpression(columns, ['description'], 'description');
    const selectCategory = this.pickExpression(columns, ['category'], 'category');
    const selectImageUrl = this.pickExpression(columns, ['imageUrl', 'image_url', 'image'], 'imageUrl');
    const selectUnitCost = this.pickExpression(columns, ['unitCost', 'unit_cost', 'price', 'priceKes'], 'unitCost');
    const selectQuantity = this.pickExpression(columns, ['quantity', 'stock'], 'quantity');
    const selectTotalCost = this.pickExpression(columns, ['totalCost', 'total_cost'], 'totalCost');
    const selectCreatedAt = this.pickExpression(columns, ['createdAt', 'created_at'], 'createdAt');
    const selectUpdatedAt = this.pickExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt');

    const hasIdColumn = columns.has('id');
    if (id && !hasIdColumn) {
      throw new Error('BigQuery products table does not include an id column.');
    }

    const idFilter = id ? 'WHERE CAST(id AS STRING) = @id' : '';
    const orderBy = columns.has('createdAt') || columns.has('created_at') ? 'ORDER BY createdAt DESC' : '';
    const limitClause = limit ? 'LIMIT @limit' : '';

    const query = `
      SELECT
        ${selectId},
        ${selectName},
        ${selectDescription},
        ${selectCategory},
        ${selectImageUrl},
        ${selectUnitCost},
        ${selectQuantity},
        ${selectTotalCost},
        ${selectCreatedAt},
        ${selectUpdatedAt}
      FROM \`${this.productsTable}\`
      ${idFilter}
      ${orderBy}
      ${limitClause}
    `;

    const params: Record<string, unknown> = {};
    if (id) {
      params.id = id;
    }
    if (limit) {
      params.limit = limit;
    }

    const [rows] = await this.bigQuery.query({
      query,
      params,
      location: process.env.BIGQUERY_LOCATION || 'US',
    });

    return (rows as Array<Record<string, unknown>>).map((row) => {
      const unitCost = row.unitCost != null ? Number(row.unitCost) : 0;
      const quantity = row.quantity != null ? Number(row.quantity) : 0;
      const totalCost =
        row.totalCost != null ? Number(row.totalCost) : Number((unitCost * quantity).toFixed(2));

      return {
        id: row.id ? String(row.id) : undefined,
        name: row.name ? String(row.name) : 'Unnamed Product',
        description: row.description ? String(row.description) : null,
        category: row.category ? String(row.category) : 'uncategorized',
        imageUrl: row.imageUrl ? String(row.imageUrl) : null,
        unitCost,
        quantity,
        totalCost,
        createdAt: row.createdAt ?? null,
        updatedAt: row.updatedAt ?? null,
      };
    });
  }

  private buildPlaceholderImageUrl(name: string) {
    return `https://placehold.co/600x400/png?text=${encodeURIComponent(name || 'Product')}`;
  }

  async create(createProductDto: CreateProductDto) {
    const unitCost = new Prisma.Decimal(createProductDto.unitCost);
    const quantity = createProductDto.quantity;
    const totalCost = unitCost.mul(quantity); // Calculate totalCost

    const product = await this.prisma.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        category: createProductDto.category,
        imageUrl: createProductDto.imageUrl || this.buildPlaceholderImageUrl(createProductDto.name),
        unitCost: unitCost,
        quantity: quantity,
        totalCost: totalCost, // Add the missing totalCost field
      },
    });
    return product;
  }

  async findAll() {
    return this.getProductsFromBigQuery();
  }

  async findOne(id: string) {
    const products = await this.getProductsFromBigQuery(1, id);
    if (products.length === 0) {
      throw new NotFoundException();
    }
    return products[0];
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException();
    }

    // Calculate new totalCost if unitCost or quantity is being updated
    const unitCost = updateProductDto.unitCost 
      ? new Prisma.Decimal(updateProductDto.unitCost) 
      : product.unitCost;
    const quantity = updateProductDto.quantity ?? product.quantity;
    const totalCost = unitCost.mul(quantity);

    const updatedData = await this.prisma.product.update({
      where: { id },
      data: {
        name: updateProductDto.name,
        description: updateProductDto.description,
        category: updateProductDto.category,
        imageUrl:
          updateProductDto.imageUrl ||
          (updateProductDto.name ? this.buildPlaceholderImageUrl(updateProductDto.name) : undefined),
        unitCost: updateProductDto.unitCost ? new Prisma.Decimal(updateProductDto.unitCost) : undefined,
        quantity: updateProductDto.quantity,
        totalCost: totalCost, // Update totalCost as well
      },
    });
    return updatedData;
  }

  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException();
    }
    const deletedData = await this.prisma.product.delete({
      where: { id },
    });
    return deletedData;
  }
}