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
import { BubbleLevel } from './bubble-level/bubble-level';
import { Compass } from './compass/compass';
import { SoundMeter } from './sound-meter/sound-meter';
import { MotionLab } from './motion-lab/motion-lab';
import { GpsFieldMeter } from './gps-field-meter/gps-field-meter';
import { PdfMerge } from './pdf-merge/pdf-merge';
import { PdfSplit } from './pdf-split/pdf-split';
import { PdfOrganize } from './pdf-organize/pdf-organize';
import { ImagesToPdf } from './images-to-pdf/images-to-pdf';
import { ImageResizer } from './image-resizer/image-resizer';
import { ImageFormatConverter } from './image-format-converter/image-format-converter';
import { ImageMetadata } from './image-metadata/image-metadata';
import { ImageBase64 } from './image-base64/image-base64';
import { QrCode } from './qr-code/qr-code';
import { BulkQrCode } from './bulk-qr-code/bulk-qr-code';
import { DeflateToolkit } from './deflate-toolkit/deflate-toolkit';
import { PasswordGenerator } from './password-generator/password-generator';
import { CaseConverter } from './case-converter/case-converter';
import { BaseConverter } from './base-converter/base-converter';
import { CronHelper } from './cron-helper/cron-helper';
import { JsonToTypescript } from './json-to-typescript/json-to-typescript';

export const APP_ROUTES: Routes = [
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
  { path: 'ipInfo', component: IpInfo },
  { path: 'bubbleLevel', component: BubbleLevel },
  { path: 'compass', component: Compass },
  { path: 'soundMeter', component: SoundMeter },
  { path: 'motionLab', component: MotionLab },
  { path: 'gpsFieldMeter', component: GpsFieldMeter },
  { path: 'pdfMerge', component: PdfMerge },
  { path: 'pdfSplit', component: PdfSplit },
  { path: 'pdfOrganize', component: PdfOrganize },
  { path: 'imagesToPdf', component: ImagesToPdf },
  { path: 'imageResizer', component: ImageResizer },
  { path: 'imageFormatConverter', component: ImageFormatConverter },
  { path: 'imageMetadata', component: ImageMetadata },
  { path: 'imageBase64', component: ImageBase64 },
  { path: 'qrCode', component: QrCode },
  { path: 'bulkQrCode', component: BulkQrCode },
  { path: 'deflateToolkit', component: DeflateToolkit },
  { path: 'passwordGenerator', component: PasswordGenerator },
  { path: 'caseConverter', component: CaseConverter },
  { path: 'baseConverter', component: BaseConverter },
  { path: 'cronHelper', component: CronHelper },
  { path: 'jsonToTypescript', component: JsonToTypescript },
  {
    path: 'localAi',
    loadComponent: () => import('./local-ai/local-ai').then((m) => m.LocalAi),
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound),
  },
];
@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES, {
    anchorScrolling: 'enabled',
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
