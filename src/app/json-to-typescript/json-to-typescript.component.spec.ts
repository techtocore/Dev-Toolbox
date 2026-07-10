import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { JsonToTypescript } from './json-to-typescript';

describe('JsonToTypescript', () => {
  let component: JsonToTypescript;
  let fixture: ComponentFixture<JsonToTypescript>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [JsonToTypescript],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JsonToTypescript);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and generate from the default sample', () => {
    expect(component).toBeTruthy();
    expect(component.error).toBeNull();
    expect(component.output).toContain('export interface Root {');
  });

  it('names nested objects and merges arrays of objects', () => {
    component.input = JSON.stringify({
      roles: ['admin', 'user'],
      profile: { social: { github: 'ada' } },
      posts: [{ title: 'a', views: 1 }, { title: 'b', views: 2, pinned: true }],
    });
    component.generate();
    expect(component.output).toContain('roles: string[];');
    expect(component.output).toContain('posts: Post[];');   // singularised
    expect(component.output).toContain('pinned?: boolean;'); // optional across the array
    expect(component.output).toContain('interface Social');  // deeply nested
  });

  it('marks keys missing from some array elements as optional', () => {
    component.input = '[{"a":1},{"a":2,"b":"x"}]';
    component.generate();
    expect(component.output).toContain('export type Root = RootItem[];');
    expect(component.output).toContain('b?: string;');
  });

  it('emits a type alias for a primitive root', () => {
    component.input = '"hello"';
    component.generate();
    expect(component.output).toBe('export type Root = string;');
  });

  it('quotes keys that are not valid identifiers', () => {
    component.input = '{"first-name":"a","123":1}';
    component.generate();
    expect(component.output).toContain('"first-name": string;');
    expect(component.output).toContain('"123": number;');
  });

  it('can emit type aliases instead of interfaces', () => {
    component.input = '{"a":1}';
    component.useType = true;
    component.generate();
    expect(component.output).toContain('export type Root = {');
  });

  it('honours the export toggle', () => {
    component.input = '{"a":1}';
    component.exportDecls = false;
    component.generate();
    expect(component.output.startsWith('interface Root {')).toBeTrue();
  });

  it('surfaces a clear error for invalid JSON', () => {
    component.input = '{ not json ]';
    component.generate();
    expect(component.error).toContain('Invalid JSON');
    expect(component.output).toBe('');
  });
});
