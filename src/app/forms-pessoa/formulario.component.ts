import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PessoaPost } from '../components/model/pessoaPost';
import { Apiresource } from '../components/resources/apiresource';

@Component({
  selector: 'app-formulario',
  templateUrl: './formulario.component.html',
  styleUrls: ['./formulario.component.css']
})
export class FormularioComponent implements OnInit, OnDestroy {
  formPessoa!: FormGroup;

  pessoa!: PessoaPost;

  sub?: Subscription;

  constructor(private api: Apiresource, private router: Router) {
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
        Validators.minLength(4)
      ]),
      numero: new FormControl(null, [
        Validators.required,
        Validators.minLength(4)
      ])
    })
  }


  onSubmit() {
    console.log(this.formPessoa)
    this.pessoa = this.formPessoa.value
    console.log('Submit: ', this.pessoa)
    this.sub = this.api.postPessoa(this.pessoa).subscribe(() => {
      this.formPessoa.reset()
      this.router.navigate([''])
    }, error => {
      console.log(error)
    })
  }
}
