import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { CronHelper } from './cron-helper';

describe('CronHelper', () => {
  let component: CronHelper;
  let fixture: ComponentFixture<CronHelper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [CronHelper],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CronHelper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and parse the default expression', () => {
    expect(component).toBeTruthy();
    expect(component.error).toBeNull();
    expect(component.nextRuns.length).toBe(5);
  });

  it('produces upcoming runs that satisfy the schedule constraints', () => {
    component.expression = '*/15 9-17 * * 1-5';
    component.parse();
    expect(component.error).toBeNull();
    for (const run of component.nextRuns) {
      const d = run.date;
      expect([0, 15, 30, 45]).toContain(d.getMinutes());
      expect(d.getHours()).toBeGreaterThanOrEqual(9);
      expect(d.getHours()).toBeLessThanOrEqual(17);
      expect(d.getDay()).toBeGreaterThanOrEqual(1); // Mon–Fri
      expect(d.getDay()).toBeLessThanOrEqual(5);
    }
  });

  it('returns strictly increasing run times', () => {
    component.expression = '0 * * * *';
    component.parse();
    for (let i = 1; i < component.nextRuns.length; i++) {
      expect(component.nextRuns[i].date.getTime())
        .toBeGreaterThan(component.nextRuns[i - 1].date.getTime());
    }
  });

  it('expands @daily to midnight runs', () => {
    component.expression = '@daily';
    component.parse();
    expect(component.error).toBeNull();
    expect(component.description.length).toBeGreaterThan(0);
    for (const run of component.nextRuns) {
      expect(run.date.getHours()).toBe(0);
      expect(run.date.getMinutes()).toBe(0);
    }
  });

  it('resolves month/day names', () => {
    component.expression = '0 0 * * MON';
    component.parse();
    expect(component.error).toBeNull();
    for (const run of component.nextRuns) {
      expect(run.date.getDay()).toBe(1);
    }
  });

  it('rejects out-of-range and malformed expressions', () => {
    component.expression = '60 * * * *';
    component.parse();
    expect(component.error).toBeTruthy();
    expect(component.nextRuns.length).toBe(0);

    component.expression = '* * * *';
    component.parse();
    expect(component.error).toContain('5 fields');
  });
});
