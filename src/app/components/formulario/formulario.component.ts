import { Validator } from './../resources/validator';
import { Apiresource } from './../resources/apiresource';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { PessoaPost } from './../model/pessoaPost';
import { Router } from '@angular/router';

@Component({
  selector: 'app-formulario',
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.css']
})
export class FormularioComponent implements OnInit {
  formPessoa!: FormGroup;
  pessoa!: PessoaPost;
  constructor(private api: Apiresource, private router: Router, private valid: Validator) { }

  createForm(pessoa: PessoaPost) {
    this.formPessoa = new FormGroup({
      nome: new FormControl(pessoa.nome),
      sexo: new FormControl(pessoa.sexo),
      cep: new FormControl(pessoa.cep),
      numero: new FormControl(pessoa.numero)
    })
  }

  ngOnInit(): void {
    this.createForm(new PessoaPost)
  }
  onSubmit() {
    this.pessoa = this.formPessoa.value
    this.api.postPessoa(this.pessoa).subscribe(data => {
      this.router.navigate([''])
    }, error => {
      console.log(error)
    })
  }
  valider(): boolean {
    return this.valid.validationPessoaPost(this.formPessoa.value)
  }
}
