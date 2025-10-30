import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToolsService } from '../services/tools.service';
import { JsonTreeComponent } from '../json-tree/json-tree.component';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
  standalone: false
})
export class SidebarMenuComponent implements OnInit {
  @ViewChild('jsonTreeComponent') jsonTree: JsonTreeComponent;
  menuData: any[] = [];

  constructor(
    private router: Router,
    private toolsService: ToolsService
  ) { }

  ngOnInit(): void {
    this.menuData = this.toolsService.getMenuData();
    
    // Listen for category expansion events from homepage
    window.addEventListener('expandCategory', (event: CustomEvent) => {
      this.expandCategory(event.detail.category);
    });
  }

  onCustomTreeSelection(value: string) {
    console.log(value);
    this.router.navigate([value]);
  }

  expandCategory(categoryName: string): void {
    // Find the index of the category in menuData
    const categoryIndex = this.menuData.findIndex(item => item.text === categoryName);
    
    if (categoryIndex !== -1 && this.jsonTree) {
      // Close all other categories first
      Object.keys(this.jsonTree.isOpen).forEach(key => {
        const index = parseInt(key);
        if (index !== categoryIndex) {
          this.jsonTree.isOpen[index] = false;
        }
      });
      
      // Open the selected category in the tree
      this.jsonTree.isOpen[categoryIndex] = true;
      
      // Scroll sidebar to the category
      setTimeout(() => {
        const sidebarElement = document.getElementById('sidebarMenu');
        if (sidebarElement) {
          sidebarElement.scrollTop = 0;
        }
      }, 100);
    }
  }
}
