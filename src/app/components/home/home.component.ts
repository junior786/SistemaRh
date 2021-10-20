import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { select, Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { Apiresource } from "../resources/apiresource";
import { deletePessoaLoad, loadPessoas, selectPessoas } from '../store/pessoa.state';
import { IPessoaState } from './../store/pessoa.state';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy, OnInit {

  sub?: Subscription

  pessoas$ = this.store.pipe(select(selectPessoas))

  constructor(private api: Apiresource, public dialog: MatDialog, private store: Store<IPessoaState>) {
    this.store.dispatch(loadPessoas())
  }

  ngOnInit(): void {
    console.log(this.store.pipe(select(selectPessoas)));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }


  removePessoa(id: number): void {
      this.store.dispatch(deletePessoaLoad({id}))
  }
}
