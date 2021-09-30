import { createAction, createReducer, props } from '@ngrx/store';
import { Pessoa } from './../model/pessoa';

export interface IPessoaState{
  pessoa: Pessoa[];
}

export const pessoaInitializeState: IPessoaState = {
  pessoa: []
}

export const loadPessoas = createAction('[app] Carrega pessoas')
export const sucessoCarregarPessoas = createAction('[app] [Sucesso] Sucesso em carregar pessoas')
export const setPessoa = createAction('[app] define pessoa', props<{payload: Pessoa[]}>())

export const appReducer = createReducer(
  pessoaInitializeState
)
