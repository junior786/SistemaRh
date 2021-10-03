
import { act } from '@ngrx/effects';
import { createAction, createReducer, on, props } from '@ngrx/store';
import {Pessoa} from '../model/pessoa';

export interface IPessoaState {
  pessoas: Pessoa[];
}

export const pessoaInitializeState: IPessoaState = {
  pessoas: []
}

export const loadPessoas = createAction('[pessoa] Carrega pessoas')
export const setPessoa = createAction('[pessoa] define pessoa', props<{ payload: Pessoa[] }>())
export const SucessoPessoas = createAction('[pessoa] Sucesso em Carrega pessoas')

export const deletePessoa = createAction('[pessoa] [delete] sucesso em deletar pessoa')
export const deletePessoaLoad = createAction('[pessoa] [delete] deletar pessoa', props<{id: number}>())
export const SucessodeletePessoa = createAction('[pessoa] [delete] sucesso em deletar pessoa')

export const appReducer = createReducer(
  pessoaInitializeState,
  on(setPessoa, (state, action) => {
    return {
      ... state,
      pessoas: action.payload
    }
    }),
    on(deletePessoaLoad, (state, {id}) =>{
      const pessoaUpdate = state.pessoas.filter((pessoa) => {
        return pessoa.id !== id;
      })
      return {
        ... state,
        pessoas: pessoaUpdate
      }
    })
)
