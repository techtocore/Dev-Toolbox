import { Component, OnInit } from '@angular/core';
import { UtilityService } from '../services/utility.service'
import * as Forge from 'node-forge'

@Component({
  selector: 'app-cert-info',
  templateUrl: './cert-info.component.html',
  styleUrls: ['./cert-info.component.scss']
})
export class CertInfoComponent implements OnInit {
  context = {
    'title': 'Certificate Information',
    'filename': 'certInfo'
  }
  encodedCert: string = '';
  certInfo: any = {};
  isMobile;
  constructor(public utilityService: UtilityService) { }

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  async decode() {
    const cert = this.encodedCert.trim();
    let parsedCert = Forge.pki.certificateFromPem(cert);

    this.certInfo.issuer = {};
    parsedCert?.issuer?.attributes?.forEach(element => {
      this.certInfo.issuer[element.name] = element.value
    });

    this.certInfo.subject = {};
    parsedCert?.subject?.attributes?.forEach(element => {
      this.certInfo.subject[element.name] = element.value
    });

    this.certInfo.serialNumber = parsedCert?.serialNumber;
    this.certInfo.validFrom = parsedCert?.validity?.notBefore;
    this.certInfo.validTill = parsedCert?.validity?.notAfter;
    this.certInfo.signatureOid = parsedCert?.signatureOid;
    this.certInfo.signAlgorithmOid = parsedCert?.siginfo?.algorithmOid;
    this.certInfo.signParameters = parsedCert?.siginfo?.parameters

  }

  saveAsFile() {
    this.utilityService.downloadFile(JSON.stringify(this.certInfo, undefined, 4), 'application/json', this.context.filename);
  }
}
