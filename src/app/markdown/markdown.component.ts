import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'
import * as marked from 'marked';

@Component({
  selector: 'app-markdown',
  templateUrl: './markdown.component.html',
  styleUrls: ['./markdown.component.scss']
})
export class MarkdownComponent implements OnInit {
  context = {
    'title': 'Markdown Editor',
  }
  markdownText: any;
  compiledMarkdown: any;
  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  compile() {
    this.compiledMarkdown = marked.parser(marked.lexer(this.markdownText));
  }
}
