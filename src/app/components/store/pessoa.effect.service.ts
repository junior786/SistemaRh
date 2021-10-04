import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType, act } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { Apiresource } from '../resources/apiresource';
import { deletePessoaLoad, IPessoaState, loadPessoas, putPessoa, setPessoa, SucessoPessoas } from './pessoa.state';

@Injectable({
  providedIn: 'root'
})
export class PessoaEffectService {

  constructor(private actions$: Actions, private http: Apiresource) { }

  carregarPessoas = createEffect(
    () => this.actions$.pipe(
      ofType(loadPessoas),
      switchMap(() => {
        return this.http.getApi()
      }),
      map(pessoa => setPessoa({ payload: pessoa }))
    )
  );

  deletePessoa = createEffect(
    () => this.actions$.pipe(
      ofType(deletePessoaLoad),
      mergeMap(action => this.http.deletePessoa(action.id).pipe(
        map(() => deletePessoaLoad({ id: action.id }))
      ))
    )
  );

  updatePessoa = createEffect(() =>
    this.actions$.pipe(
      ofType(putPessoa),
      mergeMap(action => {
        console.log('teste ', action.pessoa)
        return this.http.putPessoa(action.pessoa.id, action.pessoa).pipe(map(
          () => {
            return putPessoa({ pessoa: action.pessoa })
          }
        ))
      })
    )
  )
}
