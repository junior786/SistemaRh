import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Pessoa } from "../model/pessoa";
import { PessoaEdit } from "../model/pessoaedit";
import { PessoaPost } from './../model/pessoaPost';
import {delay} from 'rxjs/operators'
@Injectable({ providedIn: 'root' })
export class Apiresource {
  URL!: string

  constructor(private http: HttpClient) {
  }

  public getApi(): Observable<any> {
    // {withCredentials: true}
    return this.http.get(`http://localhost:8081/v1/pessoas`).pipe(delay(1000));
  }

  public putPessoa(id: string, data: Pessoa) {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    this.http.put(this.URL, new PessoaEdit(data.nome, data.sexo))
      .subscribe(resultado => {
        console.log(resultado)
      })
  }

  public deletePessoa(id: any) {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    this.http.delete(this.URL).subscribe(resultado => {
      console.log('OPA: ' + resultado)
    }, error => {
      console.log(error)
    })
  }
  public postPessoa(pessoa: PessoaPost): Observable<any> {
    this.URL = 'http://localhost:8081/v1/pessoa'
    return this.http.post(this.URL, pessoa)
  }
  public getById(id: number): Observable<Pessoa> {
    this.URL = 'http://localhost:8081/v1/pessoa/'

    return this.http.get<Pessoa>(this.URL + id)
  }
}
