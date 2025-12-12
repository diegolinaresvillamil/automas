import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TramitesModalComponent } from './tramites-modal';

describe('TramitesModalComponent', () => {
  let component: TramitesModalComponent;
  let fixture: ComponentFixture<TramitesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TramitesModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TramitesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
