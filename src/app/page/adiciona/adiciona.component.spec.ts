import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdicionaComponent } from './adiciona.component';

describe('AdicionaComponent', () => {
  let component: AdicionaComponent;
  let fixture: ComponentFixture<AdicionaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdicionaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdicionaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
