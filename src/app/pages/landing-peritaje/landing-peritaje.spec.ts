import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingPeritaje } from './landing-peritaje';

describe('LandingPeritaje', () => {
  let component: LandingPeritaje;
  let fixture: ComponentFixture<LandingPeritaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPeritaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingPeritaje);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
