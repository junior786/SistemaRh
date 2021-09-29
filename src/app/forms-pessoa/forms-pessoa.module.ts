import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsPessoaRoutingModule } from './forms-pessoa-routing.module';
import { FormularioComponent } from './formulario.component';

@NgModule({
  declarations: [
    FormularioComponent,
  ],
  imports: [
    CommonModule,
    FormsPessoaRoutingModule,
    ReactiveFormsModule,
  ],
  exports: [

  ]
})
export class FormsPessoaModule { }
