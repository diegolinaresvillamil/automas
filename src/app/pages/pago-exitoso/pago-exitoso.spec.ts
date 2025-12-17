import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoExitoso } from './pago-exitoso';

describe('PagoExitoso', () => {
  let component: PagoExitoso;
  let fixture: ComponentFixture<PagoExitoso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoExitoso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoExitoso);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
