import { map } from 'rxjs/operators';
import { IPessoaState, loadPessoas, } from './../store/pessoa.state';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { Component, Injectable, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { PessoaDialog } from "../element-dialog/pessoa-dialog.component";
import { Pessoa } from "../model/pessoa";
import { Apiresource } from "../resources/apiresource";
import { Store, select } from '@ngrx/store';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy, OnInit {


  sub?: Subscription

  pessoas$? = this.store.select('app').pipe(
    map(app => app.pessoa)
  )

  constructor(private api: Apiresource, public dialog: MatDialog, private store: Store<{ app: IPessoaState }>) {

  }
  ngOnInit(): void {
    this.store.dispatch(loadPessoas())
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }


  openDialog(pessoa: Pessoa): void {
    const dialogRef = this.dialog.open(PessoaDialog, {
      width: '250px',
      data: pessoa === null ? {
        nome: '',
        sexo: '',
      } : pessoa
    }
    );

    this.sub = dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.api.putPessoa(result.id, result)
      }
    });
  }

  removePessoa(pessoa: Pessoa): void {
    this.api.deletePessoa(pessoa.id)
  }
}
