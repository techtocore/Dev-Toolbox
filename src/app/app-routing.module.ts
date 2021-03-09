import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { Base64Component } from './base64/base64.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'base64', component: Base64Component }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
