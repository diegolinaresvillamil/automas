import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Cobertura } from './cobertura';

describe('Cobertura', () => {
  let component: Cobertura;
  let fixture: ComponentFixture<Cobertura>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cobertura]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cobertura);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
