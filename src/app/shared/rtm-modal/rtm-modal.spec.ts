import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RtmModalComponent } from './rtm-modal';

describe('RtmModalComponent', () => {
  let component: RtmModalComponent;
  let fixture: ComponentFixture<RtmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // 👇 como es standalone, va en imports
      imports: [RtmModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RtmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
