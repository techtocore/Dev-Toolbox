import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Base64Component } from './base64/base64.component';
import { UrlEncodeComponent } from './url-encode/url-encode.component';
import { JsonFormatterComponent } from './json-formatter/json-formatter.component';
import { CertInfoComponent } from './cert-info/cert-info.component';
import { MarkdownComponent } from './markdown/markdown.component';
import { WordCountComponent } from './word-count/word-count.component';
import { NumericSummaryComponent } from './numeric-summary/numeric-summary.component';
import { HashGenerator } from './hash-generator/hash-generator';
import { UuidGenerator } from './uuid-generator/uuid-generator';
import { ColorConverter } from './color-converter/color-converter';
import { TimestampConverter } from './timestamp-converter/timestamp-converter';
import { JwtDecoder } from './jwt-decoder/jwt-decoder';
import { RegexTester } from './regex-tester/regex-tester';
import { DiffChecker } from './diff-checker/diff-checker';
import { PromptTemplate } from './prompt-template/prompt-template';
import { TokenCounter } from './token-counter/token-counter';
import { JsonSchemaGenerator } from './json-schema-generator/json-schema-generator';
import { PromptOptimizer } from './prompt-optimizer/prompt-optimizer';
import { CsvJsonConverter } from './csv-json-converter/csv-json-converter';
import { SqlQueryBuilder } from './sql-query-builder/sql-query-builder';
import { DataProfiler } from './data-profiler/data-profiler';
import { IpInfo } from './ip-info/ip-info';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'base64', component: Base64Component },
  { path: 'urlEncode', component: UrlEncodeComponent },
  { path: 'hashGenerator', component: HashGenerator },
  { path: 'certinfo', component: CertInfoComponent },
  { path: 'jsonFormatter', component: JsonFormatterComponent },
  { path: 'markdown', component: MarkdownComponent },
  { path: 'wordCount', component: WordCountComponent },
  { path: 'numericSummary', component: NumericSummaryComponent },
  { path: 'uuidGenerator', component: UuidGenerator },
  { path: 'colorConverter', component: ColorConverter },
  { path: 'timestampConverter', component: TimestampConverter },
  { path: 'jwtDecoder', component: JwtDecoder },
  { path: 'regexTester', component: RegexTester },
  { path: 'diffChecker', component: DiffChecker },
  { path: 'promptTemplate', component: PromptTemplate },
  { path: 'tokenCounter', component: TokenCounter },
  { path: 'jsonSchemaGenerator', component: JsonSchemaGenerator },
  { path: 'promptOptimizer', component: PromptOptimizer },
  { path: 'csvJsonConverter', component: CsvJsonConverter },
  { path: 'sqlQueryBuilder', component: SqlQueryBuilder },
  { path: 'dataProfiler', component: DataProfiler },
  { path: 'ipInfo', component: IpInfo }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
