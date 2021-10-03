import { NotfoundComponent } from './components/notfound/notfound.component';
import { PessoaDetailsComponent } from './page/pessoa-details/pessoa-details.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IndexComponent } from './page/index/index.component';
import { PessoaDetailsResolver } from './components/guards/pessoa-details.resolver';


const routes: Routes = [
  { path: 'adicionar', loadChildren: () => import('./forms-pessoa/forms-pessoa.module').then(m => m.FormsPessoaModule) },
  { path: 'pessoa/:id', component: PessoaDetailsComponent, resolve: { pessoa: PessoaDetailsResolver } },
  { path: '', component: IndexComponent },
  { path: '**', component: NotfoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
