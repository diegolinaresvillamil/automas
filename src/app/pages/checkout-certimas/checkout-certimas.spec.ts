import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutCertimas } from './checkout-certimas';

describe('CheckoutCertimas', () => {
  let component: CheckoutCertimas;
  let fixture: ComponentFixture<CheckoutCertimas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutCertimas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutCertimas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
