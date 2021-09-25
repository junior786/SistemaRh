import { PessoaDetailsComponent } from './page/pessoa-details/pessoa-details.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdicionaComponent } from './page/adiciona/adiciona.component';
import { IndexComponent } from './page/index/index.component';


const routes: Routes = [
  { path: 'adicionar', component: AdicionaComponent },
  { path: '', component: IndexComponent },
  { path: 'pessoa/:id', component: PessoaDetailsComponent, pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
