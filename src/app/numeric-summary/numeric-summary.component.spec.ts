import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { NumericSummaryComponent } from './numeric-summary.component';

describe('NumericSummaryComponent', () => {
  let component: NumericSummaryComponent;
  let fixture: ComponentFixture<NumericSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ NumericSummaryComponent ],
      schemas: [ NO_ERRORS_SCHEMA ]
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

  it('computes core statistics for a simple comma-separated set', () => {
    component.inputTxt = '1,2,3,4,5';
    component.process();
    expect(component.hasResults).toBeTrue();
    expect(component.mean).toBe(3);
    expect(component.median).toBe(3);
    expect(component.q1).toBe(2);
    expect(component.q3).toBe(4);
    expect(component.stdDev).toBeCloseTo(1.5811, 4);
  });

  it('identifies the mode for repeated values', () => {
    component.inputTxt = '1,2,2,3';
    component.process();
    expect(component.mode).toBe('2');
  });

  it('parses whitespace-separated input and filters non-numeric tokens', () => {
    component.inputTxt = '1 2 3 4 5';
    component.process();
    expect(component.count).toBe(5);

    component.inputTxt = '1, 2, x, 4';
    component.process();
    expect(component.count).toBe(3);
    expect(component.sum).toBe(7);
  });

  it('returns NaN skewness and kurtosis for constant (zero-variance) data', () => {
    component.inputTxt = '5,5,5,5';
    component.process();
    expect(component.stdDev).toBe(0);
    expect(Number.isNaN(component.skewness)).toBeTrue();
    expect(Number.isNaN(component.kurtosis)).toBeTrue();
  });
});
