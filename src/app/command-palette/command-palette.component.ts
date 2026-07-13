import {
  Component, ElementRef, HostListener, OnInit, OnDestroy, ViewChild,
  ChangeDetectionStrategy
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tool, ToolsService } from '../services/tools.service';
import { CommandPaletteService } from '../services/command-palette.service';

@Component({
  selector: 'app-command-palette',
  standalone: false,
  templateUrl: './command-palette.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './command-palette.component.scss'
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  @ViewChild('search') searchInput?: ElementRef<HTMLInputElement>;

  open = false;
  query = '';
  results: Tool[] = [];
  selectedIndex = 0;
  allTools: Tool[] = [];

  private sub: Subscription | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    private toolsService: ToolsService,
    private router: Router,
    private paletteService: CommandPaletteService
  ) {}

  ngOnInit(): void {
    this.allTools = this.toolsService.getAllTools();
    this.results = this.allTools;
    this.sub = this.paletteService.open$.subscribe(() => this.show());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      this.move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.activate(this.results[this.selectedIndex]);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      this.searchInput?.nativeElement.focus();
    }
  }

  toggle(): void {
    if (this.open) {
      this.close();
    } else {
      this.show();
    }
  }

  show(): void {
    if (this.open) {
      this.searchInput?.nativeElement.focus();
      return;
    }

    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.open = true;
    this.query = '';
    this.results = this.allTools;
    this.selectedIndex = 0;
    setTimeout(() => this.searchInput?.nativeElement.focus(), 30);
  }

  close(restoreFocus = true): void {
    if (!this.open) {
      return;
    }

    this.open = false;
    if (restoreFocus) {
      const focusTarget = this.previouslyFocusedElement;
      setTimeout(() => focusTarget?.focus());
    }
    this.previouslyFocusedElement = null;
  }

  onInput(): void {
    const q = this.query.trim();
    this.results = q ? this.toolsService.searchTools(q) : this.allTools;
    this.selectedIndex = 0;
  }

  move(delta: number): void {
    if (this.results.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.results.length) % this.results.length;
    setTimeout(() => {
      const el = document.querySelector('.cmdk-result.is-active');
      el?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }

  activate(tool: Tool | undefined): void {
    if (!tool) return;
    this.router.navigate([tool.route]);
    this.close(false);
  }

  get activeOptionId(): string | null {
    return this.results.length > 0 ? `cmdk-option-${this.selectedIndex}` : null;
  }
}
