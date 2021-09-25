import { Pessoa } from './../../components/model/pessoa';
import { Apiresource } from './../../components/resources/apiresource';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-pessoa-details',
  templateUrl: './pessoa-details.component.html',
  styleUrls: ['./pessoa-details.component.css']
})
export class PessoaDetailsComponent implements OnInit {
  id?: number;
  pessoa?: Pessoa;

  constructor(private rout: ActivatedRoute, private api: Apiresource) { }

  ngOnInit(): void {
    this.getId();
    this.getPessoa();

  }

  private getId(){
    this.rout?.params.subscribe(params =>{
      this.id = params['id'];
    })
  }
  private getPessoa(){
    if(!!this.id){
      this.api.getById(this.id).subscribe(data =>{
        this.pessoa = data;
      }, error =>{
        console.log(error)
      })
    }
  }
}
