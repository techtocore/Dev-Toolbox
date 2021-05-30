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

@NgModule({
  declarations: [
    AppComponent,
    SidebarMenuComponent,
    HomeComponent,
    JsonTreeComponent,
    Base64Component,
    UrlEncodeComponent,
    JsonFormatterComponent
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
