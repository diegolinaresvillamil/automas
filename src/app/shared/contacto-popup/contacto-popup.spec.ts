import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactoPopup } from './contacto-popup';

describe('ContactoPopup', () => {
  let component: ContactoPopup;
  let fixture: ComponentFixture<ContactoPopup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactoPopup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactoPopup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
