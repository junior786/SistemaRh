import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Store} from '@ngrx/store';
import {map, switchMap, tap} from 'rxjs/operators';
import {Apiresource} from '../resources/apiresource';
import {IPessoaState, loadPessoas, setPessoa, SucessoPessoas} from './pessoa.state';
import {Pessoa} from "../model/pessoa";

@Injectable({
  providedIn: 'root'
})
export class PessoaEffectService {

  constructor(private actions$: Actions, private http: Apiresource, private store: Store<IPessoaState>) { }

  carregarPessoas = createEffect(
    () => this.actions$.pipe(
      ofType(loadPessoas),
      switchMap(() => this.http.getApi()),
      tap(pessoas => this.store.dispatch(setPessoa({payload: pessoas}))),
      map(() => SucessoPessoas())
    )
  )
}
