import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatToolbarModule} from "@angular/material/toolbar";
import { FooterComponent } from './components/footer/footer.component';
import {MatTableModule} from '@angular/material/table';
import { HomeComponent } from './components/home/home.component';
import {HttpClient, HttpClientModule} from "@angular/common/http";
import {MatButtonModule} from "@angular/material/button";
import {MatIconModule} from "@angular/material/icon";
import {MatDialogModule} from '@angular/material/dialog';
import { PessoaDialog } from './components/element-dialog/pessoa-dialog.component';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {FormsModule} from "@angular/forms";
import { AdicionaComponent } from './page/adiciona/adiciona.component';
import { IndexComponent } from './page/index/index.component';
import { ReactiveFormsModule } from '@angular/forms';
import { FormularioComponent } from './components/formulario/formulario.component';
import { PessoaDetailsComponent } from './page/pessoa-details/pessoa-details.component';

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    FooterComponent,
    HomeComponent,
    PessoaDialog,
    AdicionaComponent,
    IndexComponent,
    FormularioComponent,
    PessoaDetailsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatTableModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [HttpClient],
  bootstrap: [AppComponent]
})
export class AppModule { }
