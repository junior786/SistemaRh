import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { select, Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Pessoa } from '../model/pessoa';
import { deletePessoaLoad, loadPessoas, selectPessoasAll } from '../store/pessoa.state';
import { IPessoaState } from './../store/pessoa.state';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy, OnInit {

  sub?: Subscription

  pessoas$?: Observable<Pessoa[]>

  constructor(public dialog: MatDialog, private store: Store<IPessoaState>) {
    this.store.dispatch(loadPessoas())
  }

  ngOnInit(): void {
    this.pessoas$ = this.store.pipe(select(selectPessoasAll));

    console.log(this.store.pipe(select(selectPessoasAll)))
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }


  removePessoa(id: number): void {
    this.store.dispatch(deletePessoaLoad({ id }))
  }
}
