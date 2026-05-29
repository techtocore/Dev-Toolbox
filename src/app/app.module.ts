import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import "bootstrap";
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { HomeComponent } from './home/home.component';
import { JsonTreeComponent } from './json-tree/json-tree.component';
import { UtilityService } from './services/utility.service'

import { Base64Component } from './base64/base64.component';
import { UrlEncodeComponent } from './url-encode/url-encode.component';
import { JsonFormatterComponent } from './json-formatter/json-formatter.component';
import { TwoWayIoComponent } from './two-way-io/two-way-io.component';
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
import { ToastOutletComponent } from './toast-outlet/toast-outlet.component';
import { CommandPaletteComponent } from './command-palette/command-palette.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarMenuComponent,
    HomeComponent,
    JsonTreeComponent,
    Base64Component,
    UrlEncodeComponent,
    JsonFormatterComponent,
    TwoWayIoComponent,
    CertInfoComponent,
    MarkdownComponent,
    WordCountComponent,
    NumericSummaryComponent,
    HashGenerator,
    UuidGenerator,
    ColorConverter,
    TimestampConverter,
    JwtDecoder,
    RegexTester,
    DiffChecker,
    PromptTemplate,
    TokenCounter,
    JsonSchemaGenerator,
    PromptOptimizer,
    CsvJsonConverter,
    SqlQueryBuilder,
    DataProfiler,
    IpInfo,
    ToastOutletComponent,
    CommandPaletteComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    UtilityService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
