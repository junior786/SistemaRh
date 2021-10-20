import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { select, Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { Endereco } from '../model/endereco';
import { Pessoa } from '../model/pessoa';
import { deletePessoaLoad, loadPessoas, selectPessoaNameJunior, selectPessoasAll } from '../store/pessoa.state';
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

  endereco$?: Observable<Endereco[]>

  constructor(public dialog: MatDialog, private store: Store<IPessoaState>) {
    this.store.dispatch(loadPessoas())
  }

  ngOnInit(): void {
    this.pessoas$ = this.store.pipe(select(selectPessoasAll));

    // Seletor só para carregar endereços
    this.endereco$ = this.store.pipe(select(selectPessoaNameJunior));
    this.endereco$.subscribe(data => {
      console.log(data)
    })
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }


  removePessoa(id: number): void {
    this.store.dispatch(deletePessoaLoad({ id }))
  }
}
