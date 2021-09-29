import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { Component, Injectable, Input, OnChanges, OnDestroy } from '@angular/core';
import { MatDialog } from "@angular/material/dialog";
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

  displayedColumns: string[] = ['nome', 'sexo', 'acoes'];

  pessoas$?: Observable<Pessoa[]>

  sub?: Subscription

  constructor(private api: Apiresource, public dialog: MatDialog) {
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
      }
    });
  }

  removePessoa(pessoa: Pessoa): void {
    this.api.deletePessoa(pessoa.id)
  }
  getPessoas() {
   this.pessoas$ =  this.api.getApi();
  }
}
