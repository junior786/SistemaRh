import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Pessoa } from "../model/pessoa";
import { PessoaEdit } from "../model/pessoaedit";
import { PessoaPost } from './../model/pessoaPost';
import { delay } from 'rxjs/operators'
@Injectable({ providedIn: 'root' })
export class Apiresource {
  URL!: string

  constructor(private http: HttpClient) {
  }

  public getApi(): Observable<any> {
    return this.http.get(`http://localhost:8081/v1/pessoas`);
  }

  public putPessoa(id: any, data: Pessoa): Observable<any> {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    return this.http.put(this.URL, new PessoaEdit(data.nome, data.sexo))
  }

  public deletePessoa(id: number): Observable<any> {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    return this.http.delete(this.URL);
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
