import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JwtDecoder } from './jwt-decoder';

describe('JwtDecoder', () => {
  let component: JwtDecoder;
  let fixture: ComponentFixture<JwtDecoder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JwtDecoder ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JwtDecoder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
