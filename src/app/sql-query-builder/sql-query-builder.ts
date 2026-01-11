import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';

interface QueryCondition {
  field: string;
  operator: string;
  value: string;
  logic: 'AND' | 'OR';
}

interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  table: string;
  on: string;
}

@Component({
  selector: 'app-sql-query-builder',
  standalone: false,
  templateUrl: './sql-query-builder.html',
  styleUrls: ['./sql-query-builder.scss']
})
export class SqlQueryBuilder {
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'SELECT';

  // SELECT options
  tableName: string = 'users';
  selectedColumns: string = '*';
  conditions: QueryCondition[] = [];
  joins: JoinClause[] = [];
  groupBy: string = '';
  orderBy: string = '';
  orderDirection: 'ASC' | 'DESC' = 'ASC';
  limit: string = '';

  // INSERT options
  insertColumns: string = '';
  insertValues: string = '';

  // UPDATE options
  updateSet: string = '';

  generatedQuery: string = '';

  operators = [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: 'LIKE', label: 'LIKE' },
    { value: 'IN', label: 'IN' },
    { value: 'IS NULL', label: 'IS NULL' },
    { value: 'IS NOT NULL', label: 'IS NOT NULL' }
  ];

  constructor(private utilityService: UtilityService) {
    this.addCondition();
  }

  addCondition(): void {
    this.conditions.push({
      field: '',
      operator: '=',
      value: '',
      logic: 'AND'
    });
  }

  removeCondition(index: number): void {
    this.conditions.splice(index, 1);
  }

  addJoin(): void {
    this.joins.push({
      type: 'INNER',
      table: '',
      on: ''
    });
  }

  removeJoin(index: number): void {
    this.joins.splice(index, 1);
  }

  generateQuery(): void {
    this.generatedQuery = '';

    switch (this.queryType) {
      case 'SELECT':
        this.generatedQuery = this.buildSelectQuery();
        break;
      case 'INSERT':
        this.generatedQuery = this.buildInsertQuery();
        break;
      case 'UPDATE':
        this.generatedQuery = this.buildUpdateQuery();
        break;
      case 'DELETE':
        this.generatedQuery = this.buildDeleteQuery();
        break;
    }
  }

  buildSelectQuery(): string {
    let query = `SELECT ${this.selectedColumns || '*'}\nFROM ${this.tableName}`;

    // Add JOINs
    if (this.joins.length > 0) {
      this.joins.forEach(join => {
        if (join.table && join.on) {
          query += `\n${join.type} JOIN ${join.table} ON ${join.on}`;
        }
      });
    }

    // Add WHERE conditions
    const whereClause = this.buildWhereClause();
    if (whereClause) {
      query += `\nWHERE ${whereClause}`;
    }

    // Add GROUP BY
    if (this.groupBy) {
      query += `\nGROUP BY ${this.groupBy}`;
    }

    // Add ORDER BY
    if (this.orderBy) {
      query += `\nORDER BY ${this.orderBy} ${this.orderDirection}`;
    }

    // Add LIMIT
    if (this.limit) {
      query += `\nLIMIT ${this.limit}`;
    }

    query += ';';
    return query;
  }

  buildInsertQuery(): string {
    if (!this.insertColumns || !this.insertValues) {
      return '-- Please specify columns and values';
    }

    let query = `INSERT INTO ${this.tableName}\n`;
    query += `(${this.insertColumns})\n`;
    query += `VALUES\n(${this.insertValues});`;

    return query;
  }

  buildUpdateQuery(): string {
    if (!this.updateSet) {
      return '-- Please specify fields to update';
    }

    let query = `UPDATE ${this.tableName}\nSET ${this.updateSet}`;

    const whereClause = this.buildWhereClause();
    if (whereClause) {
      query += `\nWHERE ${whereClause}`;
    }

    query += ';';
    return query;
  }

  buildDeleteQuery(): string {
    let query = `DELETE FROM ${this.tableName}`;

    const whereClause = this.buildWhereClause();
    if (whereClause) {
      query += `\nWHERE ${whereClause}`;
    } else {
      query += '\n-- WARNING: No WHERE clause specified. This will delete ALL rows!';
    }

    query += ';';
    return query;
  }

  buildWhereClause(): string {
    const validConditions = this.conditions.filter(c =>
      c.field && (c.operator === 'IS NULL' || c.operator === 'IS NOT NULL' || c.value)
    );

    if (validConditions.length === 0) {
      return '';
    }

    const parts: string[] = [];

    validConditions.forEach((condition, index) => {
      let conditionStr = '';

      if (index > 0) {
        conditionStr += ` ${condition.logic} `;
      }

      if (condition.operator === 'IS NULL' || condition.operator === 'IS NOT NULL') {
        conditionStr += `${condition.field} ${condition.operator}`;
      } else if (condition.operator === 'LIKE') {
        conditionStr += `${condition.field} LIKE '%${condition.value}%'`;
      } else if (condition.operator === 'IN') {
        conditionStr += `${condition.field} IN (${condition.value})`;
      } else {
        // Check if value is numeric
        const isNumeric = !isNaN(Number(condition.value));
        const quotedValue = isNumeric ? condition.value : `'${condition.value}'`;
        conditionStr += `${condition.field} ${condition.operator} ${quotedValue}`;
      }

      parts.push(conditionStr);
    });

    return parts.join('');
  }

  copyQuery(): void {
    this.utilityService.copyToClipboard(this.generatedQuery);
  }

  downloadQuery(): void {
    this.utilityService.downloadFile(this.generatedQuery, 'text/plain', 'query.sql');
  }

  loadExample(type: string): void {
    switch (type) {
      case 'basic':
        this.queryType = 'SELECT';
        this.tableName = 'users';
        this.selectedColumns = 'id, name, email';
        this.conditions = [
          { field: 'status', operator: '=', value: 'active', logic: 'AND' }
        ];
        this.joins = [];
        this.orderBy = 'name';
        this.orderDirection = 'ASC';
        this.limit = '10';
        break;

      case 'join':
        this.queryType = 'SELECT';
        this.tableName = 'orders';
        this.selectedColumns = 'orders.id, users.name, orders.total';
        this.conditions = [
          { field: 'orders.status', operator: '=', value: 'completed', logic: 'AND' }
        ];
        this.joins = [
          { type: 'INNER', table: 'users', on: 'orders.user_id = users.id' }
        ];
        this.orderBy = 'orders.created_at';
        this.orderDirection = 'DESC';
        this.limit = '';
        break;

      case 'aggregate':
        this.queryType = 'SELECT';
        this.tableName = 'sales';
        this.selectedColumns = 'category, COUNT(*) as count, SUM(amount) as total';
        this.conditions = [];
        this.joins = [];
        this.groupBy = 'category';
        this.orderBy = 'total';
        this.orderDirection = 'DESC';
        this.limit = '';
        break;
    }
    this.generateQuery();
  }

  clearAll(): void {
    this.tableName = 'users';
    this.selectedColumns = '*';
    this.conditions = [{ field: '', operator: '=', value: '', logic: 'AND' }];
    this.joins = [];
    this.groupBy = '';
    this.orderBy = '';
    this.limit = '';
    this.generatedQuery = '';
  }
}
