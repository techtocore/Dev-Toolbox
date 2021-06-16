import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Base64Component } from './base64/base64.component';
import { UrlEncodeComponent } from './url-encode/url-encode.component';
import { JsonFormatterComponent } from './json-formatter/json-formatter.component';
import { CertInfoComponent } from './cert-info/cert-info.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'base64', component: Base64Component },
  { path: 'urlEncode', component: UrlEncodeComponent },
  { path: 'jsonFormatter', component: JsonFormatterComponent },
  { path: 'certinfo', component: CertInfoComponent }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
