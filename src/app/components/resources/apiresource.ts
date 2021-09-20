import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {Injectable} from "@angular/core";
import {Pessoa} from "../model/pessoa";
import {PessoaEdit} from "../model/pessoaedit";

@Injectable({providedIn: 'root'})
export class Apiresource {
  URL!: string

  constructor(private http: HttpClient) {
  }

  public getApi(): Observable<any> {
    return this.http.get(`http://localhost:8081/v1/pessoas`);
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
      console.log(resultado)
    })
  }

}
