import { Apiresource } from './../resources/apiresource';
import { Pessoa } from './../model/pessoa';
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from "@angular/router";
import { Observable } from "rxjs";

@Injectable()
export class PessoaDetailsResolver implements Resolve<Pessoa> {

  constructor(private api: Apiresource) {}

  resolve(
    route: ActivatedRouteSnapshot,
    ): Observable<any>|Promise<any>|any {
      let id = route.params['id']
      return this.api.getById(id)
  }
}
