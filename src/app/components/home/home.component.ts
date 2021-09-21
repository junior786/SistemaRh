import {Component, Injectable, OnInit, ViewChild} from '@angular/core';
import {Apiresource} from "../resources/apiresource";
import {Pessoa} from "../model/pessoa";
import {PessoaDialog} from "../element-dialog/pessoa-dialog.component";
import {MatDialog} from "@angular/material/dialog";
import {MatTable} from "@angular/material/table";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
@Injectable({providedIn: 'root'})
export class HomeComponent implements OnInit {
  @ViewChild(MatTable)
  table!: MatTable<any>

  displayedColumns: string[] = ['nome', 'sexo', 'acoes'];
  dataSource: any;

  constructor(private api: Apiresource, public dialog: MatDialog) {
  }

  ngOnInit(): void {
    this.getPessoas()
  }

  getPessoas(): any {
    this.api.getApi().subscribe(data => {
      this.dataSource = data;
    }, error => {
      this.dataSource = error;
    })
  }

  openDialog(pessoa: Pessoa): void {
    const dialogRef = this.dialog.open(PessoaDialog, {
        width: '250px',
        data: pessoa === null ? {
          nome: '',
          sexo: '',
          numero: '',
          endereco: null
        } : pessoa
      }
    );

    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.api.putPessoa(result.id, result)
      }
    });

  }

  removePessoa(pessoa: Pessoa): void {
    console.log(pessoa)
    this.api.deletePessoa(pessoa.id)
  }
}
