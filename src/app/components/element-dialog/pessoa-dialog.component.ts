import {Component, Inject, OnInit} from '@angular/core';
import {Pessoa} from "../model/pessoa";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

@Component({
  selector: 'app-element-dialog',
  templateUrl: './pessoa-dialog.component.html',
  styleUrls: ['./pessoa-dialog.component.css']
})
export class PessoaDialog implements OnInit {
  pessoa!: Pessoa;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data = new Pessoa,
    public dialogRef: MatDialogRef<PessoaDialog>,
  ) {}


  ngOnInit(): void {
  }

  onCancel(): void {
    this.dialogRef.close();

  }
  valid(): boolean{
      if(this.data.nome != "" && this.data.sexo!= ""){
          return false;
      }else{
        return true;
      }
  }
}
