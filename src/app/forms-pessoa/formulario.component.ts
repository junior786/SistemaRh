import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PessoaPost } from '../components/model/pessoaPost';
import { ApiCep } from '../components/resources/apicep';
import { Apiresource } from '../components/resources/apiresource';
import { ValidatorsCep } from '../components/resources/validcep';

@Component({
  selector: 'app-formulario',
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.css']
})
export class FormularioComponent implements OnInit, OnDestroy {
  formPessoa!: FormGroup;

  pessoa!: PessoaPost;

  sub?: Subscription;

  constructor(private api: Apiresource, private router: Router, private cep: ValidatorsCep) {
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ngOnInit(): void {
    this.createForm()
  }

  createForm() {
    this.formPessoa = new FormGroup({
      nome: new FormControl(null, [
        Validators.required,
        Validators.minLength(4)
      ]),
      sexo: new FormControl(null, [
        Validators.required,
        Validators.minLength(4)
      ]),
      cep: new FormControl(null, [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(8),
        this.cep.validCep(),
      ]),
      numero: new FormControl(null, [
        Validators.required,
        Validators.minLength(4)
      ])
    })
  }
  onSubmit() {
    this.pessoa = this.formPessoa.value
    this.sub = this.api.postPessoa(this.pessoa).subscribe(() => {
      this.formPessoa.reset()
      this.router.navigate([''])
    }, error => {
      console.log(error)
    })
  }
}
