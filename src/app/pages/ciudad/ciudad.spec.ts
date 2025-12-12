import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CiudadComponent } from './ciudad';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('CiudadComponent', () => {
  let component: CiudadComponent;
  let fixture: ComponentFixture<CiudadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CiudadComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['slug', 'armenia']]) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CiudadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load city data correctly', () => {
    expect(component.ciudad).toBeTruthy();
    expect(component.ciudad.nombre).toContain('Armenia');
  });
});
