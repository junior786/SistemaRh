import {IPessoaState, loadPessoas,} from '../store/pessoa.state';
import {Observable, Subscription} from 'rxjs';
import {Component, Injectable, OnDestroy, OnInit} from '@angular/core';
import {MatDialog} from "@angular/material/dialog";
import {PessoaDialog} from "../element-dialog/pessoa-dialog.component";
import {Pessoa} from "../model/pessoa";
import {Apiresource} from "../resources/apiresource";
import {select, Store} from '@ngrx/store';
import {map} from "rxjs/operators";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy, OnInit {

  sub?: Subscription

  pessoas$ = this.store.select('app').pipe(map(x => x.pessoas))


  constructor(private api: Apiresource, public dialog: MatDialog, private store: Store<{app: IPessoaState}>) {
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
