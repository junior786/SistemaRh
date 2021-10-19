import { createAction, createReducer, createSelector, on, props } from '@ngrx/store';
import { Pessoa } from '../model/pessoa';

export interface IPessoaState {
  pessoas: Pessoa[];
}

export const pessoaInitializeState: IPessoaState = {
  pessoas: []
}

export const loadPessoas = createAction('[pessoa] [carrega] Carrega pessoas')
export const setPessoa = createAction('[pessoa] [define] define pessoa', props<{ payload: Pessoa[] }>())
export const SucessoPessoas = createAction('[pessoa] Sucesso em Carrega pessoas')

export const deletePessoa = createAction(' [delete] [sucesso] sucesso em deletar pessoa')
export const deletePessoaLoad = createAction(' [delete] deletar pessoa', props<{ id: number }>())

export const selectFeature = (state: IPessoaState) => state

console.log(selectFeature, 'test')

export const selectPessoas = createSelector(
  selectFeature,
  (state: IPessoaState) => {
    console.log(state, 'TESTE')
    return state.pessoas;
  }
);

export const appReducer = createReducer(
  pessoaInitializeState,
  on(setPessoa, (state, action) => {
    return {
      ...state,
      pessoas: action.payload
    }
  }),
  on(deletePessoaLoad, (state, { id }) => {
    const pessoaUpdate = state.pessoas.filter((pessoa) => {
      return pessoa.id !== id;
    })
    return {
      ...state,
      pessoas: pessoaUpdate
    }
  }),
)
