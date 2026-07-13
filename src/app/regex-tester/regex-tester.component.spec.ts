import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { RegexTester } from './regex-tester';

describe('RegexTester', () => {
  let component: RegexTester;
  let fixture: ComponentFixture<RegexTester>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ RegexTester ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegexTester);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects oversized test input before starting a worker', () => {
    component.regexPattern = '.';
    component.testString = 'a'.repeat(1_000_001);

    component.run();

    expect(component.isRunning).toBeFalse();
    expect(component.errorMessage).toContain('1,000,000 character limit');
  });
});
