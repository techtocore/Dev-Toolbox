import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { UtilityService } from '../services/utility.service'

@Component({
  selector: 'app-two-way-io',
  templateUrl: './two-way-io.component.html',
  styleUrls: ['./two-way-io.component.scss']
})
export class TwoWayIoComponent implements OnInit {

  @Input('context') context: any = {};
  @Output() processEvent = new EventEmitter<any>();
  @Output() reverseEvent = new EventEmitter<any>();

  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  process() {
    this.processEvent.next(this.context['txt1']);
  }

  reverse() {
    this.reverseEvent.next(this.context['txt2']);
  }

  saveAsFile(txt, flag) {
    let filename = this.context['filename'];
    if (flag === 0) {
      filename = filename + '_input';
    } else {
      filename = filename + '_output';
    }
    this.utilityService.downloadFile(txt, 'text/plain', filename);
  }
}
