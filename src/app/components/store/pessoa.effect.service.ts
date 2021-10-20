import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, mergeMap } from 'rxjs/operators';
import { Apiresource } from '../resources/apiresource';
import { deletePessoaLoad, loadPessoas, setPessoa } from './pessoa.state';

@Injectable({
  providedIn: 'root'
})
export class PessoaEffectService {

  constructor(private actions$: Actions, private http: Apiresource) { }

  carregarPessoas = createEffect(
    () => this.actions$.pipe(
      ofType(loadPessoas),
      mergeMap(() => {
        return this.http.getApi()
      }),
      map(pessoa => setPessoa(pessoa))
    )
  );

  deletePessoa = createEffect(
    () => this.actions$.pipe(
      ofType(deletePessoaLoad),
      mergeMap(action => this.http.deletePessoa(action.id).pipe(
        map(() => deletePessoaLoad({ id: action.id }))
      ))
    ), { dispatch: false }
  );
}
