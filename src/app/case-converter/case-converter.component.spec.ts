import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

import { CaseConverter } from './case-converter';

describe('CaseConverter', () => {
  let component: CaseConverter;
  let fixture: ComponentFixture<CaseConverter>;

  const value = (key: string): string =>
    component.results.find((r) => r.key === key)?.value ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [CaseConverter],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CaseConverter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('tokenises camelCase, separators and acronyms', () => {
    expect(component.words('helloWorld')).toEqual(['hello', 'world']);
    expect(component.words('foo_bar-baz.qux')).toEqual(['foo', 'bar', 'baz', 'qux']);
    expect(component.words('HTMLParser')).toEqual(['html', 'parser']);
  });

  it('produces the expected identifier cases', () => {
    component.input = 'helloWorld foo_bar';
    expect(value('camel')).toBe('helloWorldFooBar');
    expect(value('pascal')).toBe('HelloWorldFooBar');
    expect(value('snake')).toBe('hello_world_foo_bar');
    expect(value('kebab')).toBe('hello-world-foo-bar');
    expect(value('constant')).toBe('HELLO_WORLD_FOO_BAR');
    expect(value('dot')).toBe('hello.world.foo.bar');
    expect(value('train')).toBe('Hello-World-Foo-Bar');
  });

  it('preserves layout for raw upper/lower transforms', () => {
    component.input = 'AbC dEf';
    expect(value('upper')).toBe('ABC DEF');
    expect(value('lower')).toBe('abc def');
  });

  it('reports an empty word list for whitespace-only input', () => {
    component.input = '   ';
    expect(component.wordCount).toBe(0);
    expect(value('camel')).toBe('');
  });
});
