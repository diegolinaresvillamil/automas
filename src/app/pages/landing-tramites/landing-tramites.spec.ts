import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingTramites } from './landing-tramites';

describe('LandingTramites', () => {
  let component: LandingTramites;
  let fixture: ComponentFixture<LandingTramites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingTramites]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingTramites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
