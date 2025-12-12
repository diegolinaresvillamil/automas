import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tecnomecanica } from './tecnomecanica';

describe('Tecnomecanica', () => {
  let component: Tecnomecanica;
  let fixture: ComponentFixture<Tecnomecanica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tecnomecanica]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tecnomecanica);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
