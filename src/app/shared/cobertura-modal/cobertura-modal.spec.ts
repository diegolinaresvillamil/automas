import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoberturaModalComponent } from './cobertura-modal';

describe('CoberturaModalComponent', () => {
  let component: CoberturaModalComponent;
  let fixture: ComponentFixture<CoberturaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoberturaModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CoberturaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
