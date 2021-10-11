import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { EMPTY, Observable } from "rxjs";
import { catchError } from "rxjs/operators";
import { Pessoa } from "../model/pessoa";
import { PessoaEdit } from "../model/pessoaedit";
import { PessoaPost } from './../model/pessoaPost';
@Injectable({ providedIn: 'root' })
export class Apiresource {
  URL!: string

  constructor(private http: HttpClient) {
  }

  public getApi(): Observable<Pessoa[]> {
    return this.http.get<Pessoa[]>(`http://localhost:8081/v1/pessoas`);
  }

  public putPessoa(id: any, data: Pessoa): Observable<Pessoa> {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    return this.http.put<Pessoa>(this.URL, new PessoaEdit(data.nome, data.sexo))
  }

  public deletePessoa(id: number): Observable<any> {
    this.URL = 'http://localhost:8081/v1/pessoa/' + id
    return this.http.delete(this.URL);
  }
  public postPessoa(pessoa: PessoaPost): Observable<Pessoa> {
    this.URL = 'http://localhost:8081/v1/pessoa'
    return this.http.post<Pessoa>(this.URL, pessoa)
  }
  public getById(id: number): Observable<Pessoa> {
    this.URL = 'http://localhost:8081/v1/pessoa/'

    return this.http.get<Pessoa>(this.URL + id);
  }
}
