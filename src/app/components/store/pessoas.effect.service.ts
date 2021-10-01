import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { EMPTY } from 'rxjs';
import { catchError, exhaustMap, map, mergeMap } from 'rxjs/operators';
import { Apiresource } from '../resources/apiresource';
import { loadPessoas, setPessoas, sucessPessoa } from './pessoa.state';

@Injectable({
  providedIn: 'root'
})
export class PessoasEffectService {

  constructor(private actions$: Actions,private api: Apiresource) {}

  
}
