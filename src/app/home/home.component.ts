import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ToolsService, Tool } from '../services/tools.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class HomeComponent implements OnInit {
  searchQuery = '';
  filteredTools: Tool[] = [];
  featuredTools: Tool[] = [];
  showResults = false;
  categories: string[] = [];
  totalTools = 0;
  appVersion = environment.version;

  constructor(private toolsService: ToolsService) { }

  ngOnInit(): void {
    this.filteredTools = this.toolsService.getAllTools();
    this.featuredTools = this.toolsService.getFeaturedTools();
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

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredTools = this.toolsService.getAllTools();
  }

  getToolsCount(category: string): number {
    return this.toolsService.getToolsByCategory(category).length;
  }

  navigateToFirstTool(category: string): void {
    // The sidebar component listens for this event and handles both opening
    // itself (on mobile) and expanding the matching category in its tree.
    const event = new CustomEvent('expandCategory', {
      detail: { category },
      bubbles: true
    });
    window.dispatchEvent(event);
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'AI & Machine Learning': 'bi-cpu',
      'Parsing & Formatting': 'bi-code-slash',
      'Encoding & Security': 'bi-shield-lock',
      'Data Analysis': 'bi-bar-chart-line',
      'Text Processing': 'bi-file-text',
      'Development Tools': 'bi-wrench',
      'Device & Sensors': 'bi-phone-vibrate',
      'PDF Tools': 'bi-file-earmark-pdf',
      'Image & Media': 'bi-image'
    };
    return icons[category] || 'bi-tools';
  }
}
