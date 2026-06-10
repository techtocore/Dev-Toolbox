import { Component } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import { ToastService } from '../services/toast.service';

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
  distinct: boolean = false;
  conditions: QueryCondition[] = [];
  joins: JoinClause[] = [];
  groupBy: string = '';
  having: string = '';
  orderBy: string = '';
  orderDirection: 'ASC' | 'DESC' = 'ASC';
  limit: string = '';
  offset: string = '';

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

  /** System prompt for the on-device "describe → SQL" feature. */
  readonly aiSystem =
    'You are an expert SQL developer. Convert the user\'s request into a single, standard ' +
    'ANSI SQL query. Output ONLY the SQL statement — no markdown code fences, no explanation, ' +
    'and no comments. Use uppercase SQL keywords. If the request is ambiguous, make reasonable ' +
    'assumptions about table and column names.';

  constructor(
    private utilityService: UtilityService,
    private toastService: ToastService,
  ) {
    this.addCondition();
  }

  /** Place an AI-generated query into the output panel (fences stripped). */
  applyAiQuery(raw: string): void {
    let sql = (raw ?? '').trim();
    const fence = sql.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (fence) {
      sql = fence[1].trim();
    }
    sql = sql.trim();
    if (!sql) {
      this.toastService.error('The model returned an empty query. Try rephrasing.');
      return;
    }
    this.generatedQuery = sql;
    this.toastService.success('Query applied — review before running it');
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
    const selectKeyword = this.distinct ? 'SELECT DISTINCT' : 'SELECT';
    let query = `${selectKeyword} ${this.selectedColumns || '*'}\nFROM ${this.tableName}`;

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

    // Add HAVING (only meaningful with GROUP BY).
    if (this.having && this.having.trim()) {
      query += `\nHAVING ${this.having.trim()}`;
    }

    // Add ORDER BY
    if (this.orderBy) {
      query += `\nORDER BY ${this.orderBy} ${this.orderDirection}`;
    }

    // Add LIMIT + optional OFFSET
    if (this.limit) {
      query += `\nLIMIT ${this.limit}`;
      if (this.offset) {
        query += ` OFFSET ${this.offset}`;
      }
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
        conditionStr += `${condition.field} LIKE '%${this.escapeSqlString(condition.value)}%'`;
      } else if (condition.operator === 'IN') {
        // IN lists are passed through verbatim — user is expected to provide
        // a comma-separated literal list (e.g. 1, 2, 3 or 'a', 'b').
        conditionStr += `${condition.field} IN (${condition.value})`;
      } else {
        // Numeric values pass through unquoted; strings get single-quoted with
        // embedded single quotes doubled per the SQL standard.
        const isNumeric = condition.value !== '' && !isNaN(Number(condition.value));
        const quotedValue = isNumeric
          ? condition.value
          : `'${this.escapeSqlString(condition.value)}'`;
        conditionStr += `${condition.field} ${condition.operator} ${quotedValue}`;
      }

      parts.push(conditionStr);
    });

    return parts.join('');
  }

  // SQL string literal escape: double up any embedded single quotes.
  private escapeSqlString(value: string): string {
    return String(value).replace(/'/g, "''");
  }

  copyQuery(): void {
    if (!this.generatedQuery) return;
    this.utilityService.copyToClipboard(this.generatedQuery, { label: 'SQL query copied' });
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
        this.having = 'SUM(amount) > 10000';
        this.orderBy = 'total';
        this.orderDirection = 'DESC';
        this.limit = '';
        break;

      case 'paginated':
        this.queryType = 'SELECT';
        this.tableName = 'posts';
        this.distinct = false;
        this.selectedColumns = 'id, title, author, published_at';
        this.conditions = [
          { field: 'published_at', operator: '<', value: 'NOW()', logic: 'AND' }
        ];
        this.joins = [];
        this.groupBy = '';
        this.having = '';
        this.orderBy = 'published_at';
        this.orderDirection = 'DESC';
        this.limit = '20';
        this.offset = '40';
        break;
    }
    this.generateQuery();
  }

  clearAll(): void {
    this.tableName = 'users';
    this.selectedColumns = '*';
    this.distinct = false;
    this.conditions = [{ field: '', operator: '=', value: '', logic: 'AND' }];
    this.joins = [];
    this.groupBy = '';
    this.having = '';
    this.orderBy = '';
    this.limit = '';
    this.offset = '';
    this.generatedQuery = '';
  }
}
