import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegexTester } from './regex-tester';

describe('RegexTester', () => {
  let component: RegexTester;
  let fixture: ComponentFixture<RegexTester>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegexTester ]
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
});
