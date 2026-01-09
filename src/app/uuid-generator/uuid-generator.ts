import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service';

@Component({
  selector: 'app-uuid-generator',
  standalone: false,
  templateUrl: './uuid-generator.html',
  styleUrl: './uuid-generator.scss',
})
export class UuidGenerator implements OnInit {
  uuids: string[] = [];
  count = 5;
  isMobile = false;

  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
    this.generate();
  }

  generate() {
    this.uuids = [];
    for (let i = 0; i < this.count; i++) {
      this.uuids.push(this.generateUUID());
    }
  }

  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async copyToClipboard(text: string): Promise<void> {
    await this.utilityService.copyToClipboard(text);
  }

  async copyAll(): Promise<void> {
    const allUuids = this.uuids.join('\n');
    await this.utilityService.copyToClipboard(allUuids);
  }

  clear() {
    this.uuids = [];
  }
}
