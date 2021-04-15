import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import "bootstrap";
import { SidebarMenuComponent } from './sidebar-menu/sidebar-menu.component';
import { HomeComponent } from './home/home.component';
import { Base64Component } from './base64/base64.component';
import { JsonTreeComponent } from './json-tree/json-tree.component';


@NgModule({
  declarations: [
    AppComponent,
    SidebarMenuComponent,
    Base64Component,
    HomeComponent,
    JsonTreeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
