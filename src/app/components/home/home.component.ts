import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { Apiresource } from "../resources/apiresource";
import { deletePessoaLoad, loadPessoas } from '../store/pessoa.state';
import { IPessoaState } from './../store/pessoa.state';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy, OnInit {

  sub?: Subscription

  pessoas$ = this.store.select(state => state.app.pessoas)

  constructor(private api: Apiresource, public dialog: MatDialog, private store: Store<{ app: IPessoaState }>) {
    this.store.dispatch(loadPessoas())
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }


  removePessoa(id: number): void {
      this.store.dispatch(deletePessoaLoad({id}))
  }
}
