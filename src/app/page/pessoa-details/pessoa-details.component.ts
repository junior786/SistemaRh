import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Pessoa } from './../../components/model/pessoa';

@Component({
  selector: 'app-pessoa-details',
  templateUrl: './pessoa-details.component.html',
  styleUrls: ['./pessoa-details.component.css']
})
export class PessoaDetailsComponent implements OnInit, OnDestroy {

  pessoa?: Pessoa;

  sub?: Subscription;

  constructor(private rout: ActivatedRoute) { }

  ngOnDestroy(): void {
    this.sub?.unsubscribe()
  } 

  ngOnInit(): void {
   this.sub = this.rout.data.subscribe(data =>{
        this.pessoa = data.pessoa;
    }, error =>{
      console.log('teste', error)
    })
  }

}

