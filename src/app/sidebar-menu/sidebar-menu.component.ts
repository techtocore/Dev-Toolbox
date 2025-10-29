import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss'],
  standalone: false
})
export class SidebarMenuComponent implements OnInit {

  constructor(private router: Router) { }
  menuData = [
    {
      "text": "Home",
      "icon": "bi bi-house",
      "link": "/"
    },
    {
      "items": [
        {
          "text": "Base64 Encode/Decode",
          "link": "/base64"
        },
        {
          "text": "URL Encode/Decode",
          "link": "/urlEncode"
        },
        {
          "text": "Hash Generator",
          "link": "/hashGenerator"
        },
        {
          "text": "JWT Decoder",
          "link": "/jwtDecoder"
        },
        {
          "text": "Certificate Information",
          "link": "/certinfo"
        }
      ],
      "text": "Cryptography",
    },
    {
      "items": [
        {
          "text": "Markdown Editor",
          "link": "/markdown"
        },
        {
          "text": "Word Counter",
          "link": "/wordCount"
        },
        {
          "text": "Diff Checker",
          "link": "/diffChecker"
        }
      ],
      "text": "Text Processing",
    },
    {
      "items": [
        {
          "text": "JSON Formatter",
          "link": "/jsonFormatter"
        },
        {
          "text": "Timestamp Converter",
          "link": "/timestampConverter"
        }
      ],
      "text": "Parsing & Formatting",
    },
    {
      "items": [
        {
          "text": "Numeric Summary",
          "link": "/numericSummary"
        }
      ],
      "text": "Statistics",
    },
    {
      "items": [
        {
          "text": "UUID Generator",
          "link": "/uuidGenerator"
        },
        {
          "text": "Color Converter",
          "link": "/colorConverter"
        },
        {
          "text": "Regex Tester",
          "link": "/regexTester"
        }
      ],
      "text": "Development Tools",
    }
  ]

  ngOnInit(): void {
  }

  onCustomTreeSelection(value) {
    console.log(value);
    this.router.navigate([value]);
  }

}
