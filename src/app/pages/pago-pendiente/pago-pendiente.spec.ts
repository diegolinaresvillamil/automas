import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoPendiente } from './pago-pendiente';

describe('PagoPendiente', () => {
  let component: PagoPendiente;
  let fixture: ComponentFixture<PagoPendiente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PagoPendiente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PagoPendiente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
