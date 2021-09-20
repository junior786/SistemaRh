import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PessoaDialog } from './pessoa-dialog.component';

describe('ElementDialogComponent', () => {
  let component: PessoaDialog;
  let fixture: ComponentFixture<PessoaDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PessoaDialog ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PessoaDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
