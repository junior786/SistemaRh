import { AuthInterceptorService } from './components/resources/auth-interceptor.service';
import { HttpClient, HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from "@angular/material/toolbar";
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PessoaDialog } from './components/element-dialog/pessoa-dialog.component';
import { FooterComponent } from './components/footer/footer.component';
import { HomeComponent } from './components/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { IndexComponent } from './page/index/index.component';
import { PessoaDetailsComponent } from './page/pessoa-details/pessoa-details.component';
import { NotfoundComponent } from './components/notfound/notfound.component';
import { PessoaDetailsResolver } from './components/guards/pessoa-details.resolver';
@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    FooterComponent,
    HomeComponent,
    PessoaDialog,
    IndexComponent,
    PessoaDetailsComponent,
    NotfoundComponent
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
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  exports: [
    MatButtonModule,

  ],
  providers: [
    HttpClient,
     {
      provide: HTTP_INTERCEPTORS, useClass: AuthInterceptorService, multi: true
     },
     PessoaDetailsResolver
  ], // ficam declarados os serviços para os componentes do modulo
  bootstrap: [AppComponent] // componente que deve ser instaciado quando iniciar a aplicação
})
export class AppModule { }
