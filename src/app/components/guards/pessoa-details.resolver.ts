import { Apiresource } from './../resources/apiresource';
import { Pessoa } from './../model/pessoa';
import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from "@angular/router";
import { EMPTY, Observable, of } from "rxjs";
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PessoaDetailsResolver implements Resolve<Pessoa> {

  constructor(private api: Apiresource, private router: Router) { }

  resolve(
    route: ActivatedRouteSnapshot,
  ): Observable<Pessoa> | Promise<Pessoa> | Pessoa {
    let id = route.params['id']
    try {
      return this.api.getById(id)
    } catch (e) {
      console.log(e)
      return EMPTY
    }
  }

}
