import { Component, Input, OnInit, Output, EventEmitter, ViewChild } from '@angular/core';
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
  @ViewChild('FileSelectInputDialog', { static: true }) private FileSelectInputDialog: any;
  isMobile;
  currentBtn = 0;

  public OpenAddFilesDialog() {
    const e: HTMLElement = this.FileSelectInputDialog.nativeElement;
    e.click();
  }

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

  async handleFileInput(files: FileList) {
    let content = await this.utilityService.readTextFile(files[0]);
    if (this.currentBtn === 0) {
      this.context['txt1'] = content;
    } else {
      this.context['txt2'] = content;
    }
  }
}
