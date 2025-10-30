import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToolsService, Tool } from '../services/tools.service';

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
    const isMobile = window.innerWidth < 768;
    
    if (isMobile && sidebarElement && !sidebarElement.classList.contains('show')) {
      // First, open the sidebar
      const bsCollapse = new (window as any).bootstrap.Collapse(sidebarElement, {
        toggle: true
      });
      
      // Wait for sidebar to open, then expand the category
      setTimeout(() => {
        const event = new CustomEvent('expandCategory', { 
          detail: { category },
          bubbles: true 
        });
        window.dispatchEvent(event);
      }, 350); // Bootstrap collapse animation takes ~350ms
    } else {
      // Desktop: just expand the category
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
