import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumericSummaryComponent } from './numeric-summary.component';

describe('NumericSummaryComponent', () => {
  let component: NumericSummaryComponent;
  let fixture: ComponentFixture<NumericSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NumericSummaryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NumericSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
