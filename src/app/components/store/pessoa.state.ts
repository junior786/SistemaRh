import { createAction, createReducer, createSelector, on, props, createFeatureSelector } from '@ngrx/store';
import { Pessoa } from '../model/pessoa';

export interface IPessoaState {
  pessoas: Pessoa[];
}

export const pessoaInitializeState: IPessoaState = {
  pessoas: []
}

export const loadPessoas = createAction('[pessoa] [carrega] Carrega pessoas')
export const setPessoa = createAction('[pessoa] [define] define pessoa', (pessoa: Pessoa[]) => ({pessoa}))
export const SucessoPessoas = createAction('[pessoa] Sucesso em Carrega pessoas')

export const deletePessoa = createAction('[delete] [sucesso] sucesso em deletar pessoa')
export const deletePessoaLoad = createAction('[delete] deletar pessoa', props<{ id: number }>())

export const selectPessoa = createFeatureSelector<IPessoaState>('app');

export const selectPessoasAll = createSelector(
  selectPessoa,
  (pessoas: IPessoaState) => {
    return pessoas.pessoas;
  }
);

export const appReducer = createReducer(
  pessoaInitializeState,
  on(setPessoa, (state, action) => {
    return {
      ...state,
      pessoas: action.pessoa
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
);
