
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
import { EffectsModule, USER_PROVIDED_EFFECTS } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PessoaDialog } from './components/element-dialog/pessoa-dialog.component';
import { FooterComponent } from './components/footer/footer.component';
import { PessoaDetailsResolver } from './components/guards/pessoa-details.resolver';
import { HomeComponent } from './components/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { NotfoundComponent } from './components/notfound/notfound.component';
import { AuthInterceptorService } from './components/resources/auth-interceptor.service';
import { PessoaEffectService } from './components/store/pessoa.effect.service';
import { appReducer } from "./components/store/pessoa.state";
import { IndexComponent } from './page/index/index.component';
import { PessoaDetailsComponent } from './page/pessoa-details/pessoa-details.component';

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
    StoreModule.forRoot({ app: appReducer}),
    EffectsModule.forRoot([PessoaEffectService]),
    StoreDevtoolsModule.instrument({ maxAge: 25, logOnly: environment.production })
  ],
  exports: [
    MatButtonModule,

  ],
  providers: [
    HttpClient,
     {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
     },
    PessoaEffectService,
    {
      provide: USER_PROVIDED_EFFECTS,
      multi: true,
      useValue: [PessoaEffectService],
    },
     PessoaDetailsResolver
  ], // ficam declarados os serviços para os componentes do modulo
  bootstrap: [AppComponent] // componente que deve ser instaciado quando iniciar a aplicação
})
export class AppModule { }
