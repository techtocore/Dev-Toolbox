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
  { path: 'timestampConverter', component: TimestampConverter }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
