import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { CommandPaletteComponent } from './command-palette.component';
import { CommandPaletteService } from '../services/command-palette.service';

describe('CommandPaletteComponent', () => {
  let component: CommandPaletteComponent;
  let fixture: ComponentFixture<CommandPaletteComponent>;
  let paletteService: CommandPaletteService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, RouterTestingModule],
      declarations: [CommandPaletteComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CommandPaletteComponent);
    component = fixture.componentInstance;
    paletteService = TestBed.inject(CommandPaletteService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('opens with accessible combobox and listbox semantics', fakeAsync(() => {
    paletteService.open();
    fixture.detectChanges();
    tick(30);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('[role="combobox"]') as HTMLInputElement;
    const selectedOption = fixture.nativeElement.querySelector('[role="option"][aria-selected="true"]');

    expect(input === document.activeElement).toBeTrue();
    expect(input.getAttribute('aria-controls')).toBe('cmdk-results');
    expect(input.getAttribute('aria-activedescendant')).toBe('cmdk-option-0');
    expect(selectedOption).not.toBeNull();
  }));

  it('navigates to the selected tool when Enter is pressed', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    component.show();
    component.query = 'gzip';
    component.onInput();

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
    component.onInputKeydown(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(navigateSpy).toHaveBeenCalledOnceWith(['/deflateToolkit']);
    expect(component.open).toBeFalse();
  });

  it('restores focus to the opener when Escape closes the palette', fakeAsync(() => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    component.show();
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    component.onInputKeydown(event);
    tick();

    expect(event.defaultPrevented).toBeTrue();
    expect(document.activeElement === opener).toBeTrue();
    opener.remove();
  }));
});
