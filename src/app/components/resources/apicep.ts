import { EMPTY, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from "@angular/core";
import { AbstractControl, FormControl, ValidatorFn } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class ApiCep {
  private URL = 'https://viacep.com.br/ws/'

  constructor(private http: HttpClient) { }

  public getCep(cep: string): Observable<any> {
    return this.http.get(this.URL + cep + "/json")
  }

  
}
