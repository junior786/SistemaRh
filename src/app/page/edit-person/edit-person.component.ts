import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pessoa } from 'src/app/components/model/pessoa';
import { Apiresource } from 'src/app/components/resources/apiresource';

@Component({
  selector: 'app-edit-person',
  templateUrl: './edit-person.component.html',
  styleUrls: ['./edit-person.component.css']
})
export class EditPersonComponent implements OnInit, OnDestroy {
  pessoa?: Pessoa;
  sub?: Subscription;
  formPessoa!: FormGroup

  constructor(private rout: ActivatedRoute, private api: Apiresource, private route: Router) {
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  ngOnInit(): void {
    this.sub = this.rout.data.subscribe(data => {
      this.pessoa = data.pessoa;
    });
    
    this.createForm();
  }

  createForm(): void {
    this.formPessoa = new FormGroup({
      nome: new FormControl(this.pessoa?.nome, [
        Validators.required,
        Validators.minLength(4)
      ]),
      sexo: new FormControl(this.pessoa?.sexo, [
        Validators.required,
        Validators.minLength(4)
      ]),
    })
  }

  onSubmit(): void {
    let id = this.pessoa?.id;
    this.pessoa = this.formPessoa?.value
    if (!!this.pessoa) {
      this.sub = this.api.putPessoa(id, this.pessoa).subscribe();
      this.route.navigate([''])
    }
  }

}
