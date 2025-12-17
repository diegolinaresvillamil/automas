import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentModalComponent } from './payment-modal';
import { PaymentModalService } from './payment-modal.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PaymentModalComponent', () => {
  let component: PaymentModalComponent;
  let fixture: ComponentFixture<PaymentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PaymentModalComponent,
        HttpClientTestingModule
      ],
      providers: [
        PaymentModalService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with closed state', () => {
    expect(component.open()).toBe(false);
  });

  it('should have step 3 by default', () => {
    expect(component.step).toBe(3);
  });
});