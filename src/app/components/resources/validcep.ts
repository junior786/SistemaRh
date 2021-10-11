import { Injectable } from "@angular/core";
import { AbstractControl, ValidatorFn } from "@angular/forms";
import { ApiCep } from "./apicep";

@Injectable({ providedIn: 'root' })
export class ValidatorsCep  {
    constructor(private cep: ApiCep) {
        this.validCep()
     }

    public validCep(): ValidatorFn {
        let valid: any;
        return (c: AbstractControl): { [key: string]: boolean } | null => {
            this.cep.getCep(c.value).subscribe(data => {
                console.log('teste: ', data)
                return null;
            }, error => {
                console.log('erro ein: ', error)
                return {'cepInvalid': true}
            })
            return {'cepInvalid': true}
        };
    }
}