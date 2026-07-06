import { Injectable, Logger } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly bigQuery = new BigQuery();
  private readonly financeTable =
    process.env.BIGQUERY_FINANCE_TABLE ||
    'pawait-data-hub.cloud_mastery.table_finance';

  private parseBigQueryTable() {
    const parts = this.financeTable.split('.');
    if (parts.length !== 3) {
      throw new Error(
        `Invalid BIGQUERY_FINANCE_TABLE format: ${this.financeTable}. Expected <project>.<dataset>.<table>`,
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

    return `\`${found}\` AS ${alias}`;
  }

  private inferProductType(name: string) {
    const normalized = name.toLowerCase();
    if (normalized.includes('money market') || normalized.includes('mmf')) {
      return 'MMF';
    }
    if (normalized.includes('treasury') || normalized.includes('t-bill') || normalized.includes('bond')) {
      return 'Government Security';
    }
    if (normalized.includes('fixed deposit')) {
      return 'Fixed Deposit';
    }
    return 'Finance';
  }

  async findAll() {
    try {
      const columns = await this.getBigQueryColumns();
      const selectId = this.pickExpression(columns, ['id', 'Id', 'ID'], 'id');
      const selectSku = this.pickExpression(columns, ['sku'], 'sku');
      const selectProductName = this.pickExpression(
        columns,
        ['productName', 'product_name', 'name', 'title', 'Name'],
        'productName',
      );
      const selectProductType = this.pickExpression(
        columns,
        ['productType', 'product_type', 'category', 'Category'],
        'productType',
      );
      const selectSubType = this.pickExpression(columns, ['subType', 'sub_type'], 'subType');
      const selectProvider = this.pickExpression(columns, ['provider'], 'provider');
      const selectDescription = this.pickExpression(columns, ['description', 'Details'], 'description');
      const selectMinInvestmentKes = this.pickExpression(
        columns,
        [
          'minInvestmentKes',
          'min_investment_kes',
          'minimumInvestmentKes',
          'minimum_investment_kes',
          'Minimum_Requirement',
        ],
        'minInvestmentKes',
      );
      const selectExpectedReturnPct = this.pickExpression(
        columns,
        [
          'expectedReturnPct',
          'expected_return_pct',
          'returnPct',
          'return_pct',
          'Interest_Rate',
        ],
        'expectedReturnPct',
      );
      const selectRiskLevel = this.pickExpression(columns, ['riskLevel', 'risk_level'], 'riskLevel');
      const selectLiquidity = this.pickExpression(columns, ['liquidity'], 'liquidity');
      const selectTenor = this.pickExpression(columns, ['tenor'], 'tenor');
      const selectRegulatedBy = this.pickExpression(columns, ['regulatedBy', 'regulated_by'], 'regulatedBy');
      const selectBestFor = this.pickExpression(columns, ['bestFor', 'best_for'], 'bestFor');
      const selectTargetAgeMin = this.pickExpression(columns, ['targetAgeMin', 'target_age_min'], 'targetAgeMin');
      const selectTargetAgeMax = this.pickExpression(columns, ['targetAgeMax', 'target_age_max'], 'targetAgeMax');
      const selectCreatedAt = this.pickExpression(columns, ['createdAt', 'created_at'], 'createdAt');
      const selectUpdatedAt = this.pickExpression(columns, ['updatedAt', 'updated_at'], 'updatedAt');

      const orderBy = columns.has('createdAt') || columns.has('created_at') ? 'ORDER BY createdAt DESC' : '';
      const query = `
        SELECT
          ${selectId},
          ${selectSku},
          ${selectProductName},
          ${selectProductType},
          ${selectSubType},
          ${selectProvider},
          ${selectDescription},
          ${selectMinInvestmentKes},
          ${selectExpectedReturnPct},
          ${selectRiskLevel},
          ${selectLiquidity},
          ${selectTenor},
          ${selectRegulatedBy},
          ${selectBestFor},
          ${selectTargetAgeMin},
          ${selectTargetAgeMax},
          ${selectCreatedAt},
          ${selectUpdatedAt}
        FROM \`${this.financeTable}\`
        ${orderBy}
      `;

      const [rows] = await this.bigQuery.query({
        query,
        location: process.env.BIGQUERY_LOCATION || 'US',
      });

      return (rows as Array<Record<string, unknown>>).map((row, index) => {
        const name = row.productName ? String(row.productName) : 'Unnamed Finance Product';
        const derivedId = `finance-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        return {
        id: row.id ? String(row.id) : derivedId,
        sku: row.sku ? String(row.sku) : undefined,
        productName: name,
        productType: row.productType ? String(row.productType) : this.inferProductType(name),
        subType: row.subType ? String(row.subType) : null,
        provider: row.provider ? String(row.provider) : null,
        description: row.description ? String(row.description) : null,
        minInvestmentKes:
          row.minInvestmentKes != null ? Number(row.minInvestmentKes).toString() : '0',
        expectedReturnPct:
          row.expectedReturnPct != null ? Number(row.expectedReturnPct).toString() : '0',
        riskLevel: row.riskLevel ? String(row.riskLevel) : 'Unknown',
        liquidity: row.liquidity ? String(row.liquidity) : null,
        tenor: row.tenor ? String(row.tenor) : null,
        regulatedBy: row.regulatedBy ? String(row.regulatedBy) : null,
        bestFor: row.bestFor ? String(row.bestFor) : null,
        targetAgeMin: row.targetAgeMin != null ? String(row.targetAgeMin) : null,
        targetAgeMax: row.targetAgeMax != null ? String(row.targetAgeMax) : null,
        created_at: row.createdAt ?? null,
        updated_at: row.updatedAt ?? null,
      };
      });
    } catch (error) {
      this.logger.error(
        `Finance BigQuery read failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw error;
    }
  }
}
