import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToolsService, Tool } from '../services/tools.service';
import { environment } from '../../environments/environment';

// Constant for mobile breakpoint (matches Bootstrap's md breakpoint)
const MOBILE_BREAKPOINT = 768;
const SIDEBAR_ANIMATION_DELAY = 350;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false
})
export class HomeComponent implements OnInit {
  searchQuery = '';
  filteredTools: Tool[] = [];
  showResults = false;
  categories: string[] = [];
  totalTools = 0;
  appVersion = environment.version;

  constructor(
    private toolsService: ToolsService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.filteredTools = this.toolsService.getAllTools();
    this.categories = this.toolsService.getCategories();
    this.totalTools = this.filteredTools.length;
  }

  onSearchChange(): void {
    this.filteredTools = this.toolsService.searchTools(this.searchQuery);
    this.showResults = true;
  }

  onSearchFocus(): void {
    this.showResults = true;
    if (!this.searchQuery) {
      this.filteredTools = this.toolsService.getAllTools();
    }
  }

  onSearchBlur(): void {
    // Delay to allow click event on results
    setTimeout(() => {
      this.showResults = false;
    }, 200);
  }

  selectTool(tool: Tool): void {
    this.router.navigate([tool.route]);
    this.searchQuery = '';
    this.showResults = false;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredTools = this.toolsService.getAllTools();
  }

  getToolsCount(category: string): number {
    return this.toolsService.getToolsByCategory(category).length;
  }

  navigateToFirstTool(category: string): void {
    // Check if we're on mobile (sidebar is collapsed)
    const sidebarElement = document.getElementById('sidebarMenu');
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;

    if (isMobile && sidebarElement && !sidebarElement.classList.contains('show')) {
      // First, open the sidebar by adding the 'show' class
      sidebarElement.classList.add('show');

      // Also update the toggler button state
      const togglerButton = document.querySelector('.navbar-toggler');
      if (togglerButton) {
        togglerButton.classList.remove('collapsed');
        togglerButton.setAttribute('aria-expanded', 'true');
      }

      // Wait for sidebar to open, then expand the category
      setTimeout(() => {
        const event = new CustomEvent('expandCategory', {
          detail: { category },
          bubbles: true
        });
        window.dispatchEvent(event);
      }, SIDEBAR_ANIMATION_DELAY); // Allow time for animation
    } else {
      // Desktop or sidebar already open: just expand the category
      const event = new CustomEvent('expandCategory', {
        detail: { category },
        bubbles: true
      });
      window.dispatchEvent(event);
    }
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Cryptography': 'bi-shield-lock',
      'Text Processing': 'bi-file-text',
      'Parsing & Formatting': 'bi-code-slash',
      'Statistics': 'bi-graph-up',
      'Development Tools': 'bi-wrench'
    };
    return icons[category] || 'bi-tools';
  }
}
