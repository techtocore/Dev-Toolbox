import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  styleUrls: ['./sidebar-menu.component.scss']
})
export class SidebarMenuComponent implements OnInit {

  constructor() { }
  menuData = [
    {
      "text": "Home",
      "icon": "bi bi-house"
    },
    {
      "items": [
        {
          "text": "Base64 Encode/Decode",
        },
        {
          "text": "FireAMP/Threatgrid",
        }
      ],
      "text": "Cryptography",
    },
    {
      "items": [
        {
          "text": "Base64 Encode/Decode",
        },
        {
          "text": "FireAMP/Threatgrid",
        }
      ],
      "text": "Miscellaneous Tools",
    }
  ]

  ngOnInit(): void {
  }

  onCustomTreeSelection(value) {
    console.log(value);
  }

}
