import { Injectable } from "@angular/core";
import { AbstractControl, ValidatorFn } from "@angular/forms";
import { ApiCep } from "./apicep";

@Injectable({ providedIn: 'root' })
export class ValidatorsCep {
    constructor(private cep: ApiCep) {
    }

    public validCep(): ValidatorFn {
        let valid: any;
        return (c: AbstractControl): { [key: string]: boolean } | null => {
            try {
                this.cep.getCep(c.value).subscribe(data => {
                    console.log(data)
                })
                return null
            } catch (error) {
                return { 'cepInvalid': true }
            }
        };
    }
}