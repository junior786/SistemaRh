import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class ApiCep {
  URL = 'https://viacep.com.br/ws/'

  constructor(private http: HttpClient) { }

  public getCep(cep: string): Observable<any> {
    return this.http.get(this.URL + cep + "/json")
  }
}
