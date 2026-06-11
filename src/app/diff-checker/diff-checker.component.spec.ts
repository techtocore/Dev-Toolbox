import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { DiffChecker } from './diff-checker';

describe('DiffChecker', () => {
  let component: DiffChecker;
  let fixture: ComponentFixture<DiffChecker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ DiffChecker ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiffChecker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reports no changes for identical multi-line text', () => {
    component.text1 = 'one\ntwo\nthree';
    component.text2 = 'one\ntwo\nthree';
    component.compareTexts();
    expect(component.addedCount).toBe(0);
    expect(component.removedCount).toBe(0);
    expect(component.diffLines.every(l => l.type === 'same')).toBeTrue();
  });

  it('detects a single changed middle line as one removal and one addition', () => {
    component.text1 = 'one\ntwo\nthree';
    component.text2 = 'one\nTWO-CHANGED\nthree';
    component.compareTexts();
    expect(component.removedCount).toBe(1);
    expect(component.addedCount).toBe(1);
    expect(component.unchangedCount).toBe(2);
  });

  it('detects an inserted line with the correct content and line number', () => {
    component.text1 = 'a\nb';
    component.text2 = 'a\nX\nb';
    component.compareTexts();
    expect(component.addedCount).toBe(1);
    const added = component.diffLines.find(l => l.type === 'added');
    expect(added?.content).toBe('X');
    expect(added?.lineNumber2).toBe(2);
  });

  it('treats lines as equal under ignoreCase', () => {
    component.ignoreCase = true;
    component.text1 = 'Hello';
    component.text2 = 'hello';
    component.compareTexts();
    expect(component.unchangedCount).toBe(1);
    expect(component.addedCount).toBe(0);
  });

  it('treats lines as equal under ignoreWhitespace', () => {
    component.ignoreWhitespace = true;
    component.text1 = 'a  b';
    component.text2 = 'a b';
    component.compareTexts();
    expect(component.unchangedCount).toBe(1);
  });
});
