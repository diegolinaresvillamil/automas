import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SedesTarifasModalComponent } from './sedes-tarifas-modal';

describe('SedesTarifasModal', () => {
  let component: SedesTarifasModalComponent;
  let fixture: ComponentFixture<SedesTarifasModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SedesTarifasModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SedesTarifasModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
