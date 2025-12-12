import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingTecnomecanica } from './landing-tecnomecanica';

describe('LandingTecnomecanica', () => {
  let component: LandingTecnomecanica;
  let fixture: ComponentFixture<LandingTecnomecanica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingTecnomecanica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingTecnomecanica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
