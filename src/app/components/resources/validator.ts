import { Injectable } from '@angular/core';
import { PessoaPost } from './../model/pessoaPost';


@Injectable({ providedIn: 'root' })
export class Validator {

  public validationPessoaPost(pessoa: PessoaPost): boolean{
    if (pessoa.nome != "" && pessoa.nome != null) {
      return false;
    } else {
      return true;
    }
  }
}
