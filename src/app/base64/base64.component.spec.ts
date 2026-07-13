import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { Base64Component } from './base64.component';

describe('Base64Component', () => {
  let component: Base64Component;
  let fixture: ComponentFixture<Base64Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ FormsModule ],
      declarations: [ Base64Component ],
      schemas: [ NO_ERRORS_SCHEMA ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Base64Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('encodes ASCII text to standard base64', () => {
    component.decoded = 'Hello, world';
    component.encode();
    expect(component.encoded).toBe('SGVsbG8sIHdvcmxk');
  });

  it('round-trips Unicode text through encode/decode', () => {
    const original = 'Hello, Dev Toolbox! 👋 — base64 round-trip with Unicode.';
    component.decoded = original;
    component.encode();
    const enc = component.encoded;

    component.encoded = enc;
    component.decoded = '';
    component.decode();
    expect(component.decoded).toBe(original);
  });

  it('produces url-safe output with no +, / or = and round-trips it', () => {
    component.setVariant('urlsafe');
    component.decoded = '???>>>';
    component.encode();
    expect(component.encoded).not.toMatch(/[+/=]/);

    component.decoded = '';
    component.decode();
    expect(component.decoded).toBe('???>>>');
  });

  it('decodes unpadded standard base64', () => {
    component.variant = 'standard';
    component.encoded = 'SGVsbG8';
    component.decode();
    expect(component.decoded).toBe('Hello');
  });

  it('rejects encoded text that would exceed the decoded-data limit', () => {
    component.encoded = 'A'.repeat(Math.ceil(10 * 1024 * 1024 * 4 / 3) + 5);

    component.decode();

    expect(component.decoded).toBe('');
    expect(component.errorMessage).toContain('10 MB');
  });
});
