import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
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
        }
      ],
      "text": "Text Processing",
    },
    {
      "items": [
        {
          "text": "JSON Formatter",
          "link": "/jsonFormatter"
        }
      ],
      "text": "Miscellaneous Tools",
    }
  ]

  ngOnInit(): void {
  }

  onCustomTreeSelection(value) {
    console.log(value);
    this.router.navigate([value]);
  }

}
