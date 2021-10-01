import { createAction, createReducer, props } from "@ngrx/store";
import { Pessoa } from "../model/pessoa";


export interface IPessoaStore{
    pessoa: Pessoa[]

}


export const loadPessoas = createAction('[pessoas] carregas pessoas');
export const sucessPessoa = createAction('[pessoas] [sucesso] carregando pessoas');
export const setPessoas = createAction('[pessoas] define pessoas', props<{payload: IPessoaStore}>())
