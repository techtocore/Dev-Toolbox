import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { BaseConverter } from './base-converter';

describe('BaseConverter', () => {
  let component: BaseConverter;
  let fixture: ComponentFixture<BaseConverter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [BaseConverter],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BaseConverter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and seed every field from the default value', () => {
    expect(component).toBeTruthy();
    expect(component.f.dec).toBe('255');
    expect(component.f.hex).toBe('ff');
    expect(component.f.oct).toBe('377');
    expect(component.f.bin).toBe('11111111');
    expect(component.f.custom).toBe('7v'); // base 32
  });

  it('cross-converts when a field is edited', () => {
    component.f.hex = '1a';
    component.onEdit('hex');
    expect(component.f.dec).toBe('26');
    expect(component.f.bin).toBe('11010');
    expect(component.error).toBeNull();
  });

  it('accepts prefixes and separators', () => {
    component.f.hex = '0xDE_AD';
    component.onEdit('hex');
    expect(component.f.dec).toBe('57005');
  });

  it('keeps arbitrarily large integers exact via BigInt', () => {
    component.f.hex = 'ffffffffffffffffffff';
    component.onEdit('hex');
    expect(component.f.dec).toBe('1208925819614629174706175');
  });

  it('flags invalid input without disturbing the other fields', () => {
    component.f.hex = 'ff';
    component.onEdit('hex');
    component.f.dec = 'not-a-number';
    component.onEdit('dec');
    expect(component.error).toContain('not a valid');
    expect(component.f.hex).toBe('ff'); // untouched
  });

  it('re-cases hex letters when the uppercase toggle changes', () => {
    component.f.dec = '255';
    component.onEdit('dec');
    component.uppercase = true;
    component.applyCase();
    expect(component.f.hex).toBe('FF');
  });

  it('exposes bit width for the current value', () => {
    component.f.dec = '255';
    component.onEdit('dec');
    expect(component.bitLength).toBe(8);
    expect(component.byteCount).toBe(1);
  });
});
