import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeritajeModalComponent } from './peritaje-modal';

describe('PeritajeModalComponent', () => {
  let component: PeritajeModalComponent;
  let fixture: ComponentFixture<PeritajeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeritajeModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PeritajeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
