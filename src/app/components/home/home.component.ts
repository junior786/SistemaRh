import { Component, Injectable, OnDestroy } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { PessoaDialog } from "../element-dialog/pessoa-dialog.component";
import { Pessoa } from "../model/pessoa";
import { Apiresource } from "../resources/apiresource";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({ providedIn: 'root' })
export class HomeComponent implements OnDestroy {

  pessoas$?: Observable<Pessoa[]>

  sub?: Subscription

  constructor(private api: Apiresource, public dialog: MatDialog, private route: Router) {
    this.getPessoas()
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
        window.location.reload()
      }
    });
  }

  removePessoa(pessoa: Pessoa): void {
    this.api.deletePessoa(pessoa.id)
    window.location.reload()
  }
  getPessoas() {
   this.pessoas$ =  this.api.getApi();
  }
}
