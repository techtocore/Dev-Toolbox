import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { UtilityService } from '../services/utility.service';
import * as Forge from 'node-forge';

interface CertificateInfo {
  issuer?: Record<string, string | string[]>;
  subject?: Record<string, string | string[]>;
  serialNumber?: string;
  validFrom?: Date;
  validTill?: Date;
  signatureOid?: string;
  signAlgorithmOid?: string;
  thumbprintSha1?: string;
  thumbprintSha256?: string;
  publicKeyType?: string;
  publicKeyBits?: number;
  subjectAltNames?: string[];
  keyUsage?: string[];
  extKeyUsage?: string[];
  isCa?: boolean;
  pemBytes?: number;
  error?: string;
  message?: string;
}

@Component({
  selector: 'app-cert-info',
  templateUrl: './cert-info.component.html',
  styleUrls: ['./cert-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class CertInfoComponent implements OnInit {
  context = {
    title: 'Certificate Information',
    filename: 'certInfo'
  };
  encodedCert: string = '';
  certInfo: CertificateInfo = {};
  isMobile: boolean = false;

  // No-op comparator for KeyValuePipe so Subject/Issuer DN components keep their
  // original certificate order instead of being sorted alphabetically.
  keepOrder = (): number => 0;

  constructor(public utilityService: UtilityService) {}

  ngOnInit(): void {
    this.isMobile = this.utilityService.getIsMobile();
  }

  decode(): void {
    const cert = this.encodedCert.trim();
    this.certInfo = {};

    if (!cert) {
      this.certInfo.error = 'Paste a PEM-encoded certificate first.';
      return;
    }

    try {
      const parsedCert = Forge.pki.certificateFromPem(cert);

      this.certInfo.issuer = {};
      parsedCert?.issuer?.attributes?.forEach(a => {
        const key = a.name || a.type || 'unknown';
        const existing = this.certInfo.issuer![key];
        this.certInfo.issuer![key] = existing === undefined
          ? (a.value as any)
          : ([] as any[]).concat(existing, a.value);
      });

      this.certInfo.subject = {};
      parsedCert?.subject?.attributes?.forEach(a => {
        const key = a.name || a.type || 'unknown';
        const existing = this.certInfo.subject![key];
        this.certInfo.subject![key] = existing === undefined
          ? (a.value as any)
          : ([] as any[]).concat(existing, a.value);
      });

      this.certInfo.serialNumber = parsedCert?.serialNumber;
      this.certInfo.validFrom = parsedCert?.validity?.notBefore;
      this.certInfo.validTill = parsedCert?.validity?.notAfter;
      const sigOid = parsedCert?.signatureOid;
      // Resolve the OID to a friendly algorithm name (e.g. sha256WithRSAEncryption),
      // falling back to the raw OID when unknown.
      this.certInfo.signatureOid =
        (sigOid && (Forge.pki.oids as Record<string, string>)[sigOid]) || sigOid;
      this.certInfo.signAlgorithmOid = parsedCert?.siginfo?.algorithmOid;

      const der = Forge.asn1.toDer(Forge.pki.certificateToAsn1(parsedCert)).getBytes();
      const sha1 = Forge.md.sha1.create();
      sha1.update(der);
      this.certInfo.thumbprintSha1 = sha1.digest().toHex();

      const sha256 = Forge.md.sha256.create();
      sha256.update(der);
      this.certInfo.thumbprintSha256 = sha256.digest().toHex();

      // Public key info
      const pubKey: any = parsedCert.publicKey;
      if (pubKey?.n) {
        this.certInfo.publicKeyType = 'RSA';
        this.certInfo.publicKeyBits = pubKey.n.bitLength();
      }
      // Note: node-forge throws ("OID is not RSA") in certificateFromPem above for
      // EC/Ed certificates, so only RSA keys ever reach this point.

      // SAN extension
      const sanExt: any = parsedCert.getExtension('subjectAltName');
      if (sanExt?.altNames) {
        this.certInfo.subjectAltNames = sanExt.altNames.map((n: any) => {
          if (n.type === 2) return `DNS:${n.value}`;
          if (n.type === 7) return `IP:${n.ip || n.value}`;
          if (n.type === 1) return `email:${n.value}`;
          if (n.type === 6) return `URI:${n.value}`;
          return String(n.value);
        });
      }

      const keyUsageExt: any = parsedCert.getExtension('keyUsage');
      if (keyUsageExt) {
        const usages: string[] = [];
        ['digitalSignature','nonRepudiation','keyEncipherment','dataEncipherment','keyAgreement','keyCertSign','cRLSign','encipherOnly','decipherOnly']
          .forEach(k => { if (keyUsageExt[k]) usages.push(k); });
        if (usages.length) this.certInfo.keyUsage = usages;
      }

      const extKeyUsageExt: any = parsedCert.getExtension('extKeyUsage');
      if (extKeyUsageExt) {
        const ekus: string[] = [];
        ['serverAuth','clientAuth','codeSigning','emailProtection','timeStamping','OCSPSigning']
          .forEach(k => { if (extKeyUsageExt[k]) ekus.push(k); });
        if (ekus.length) this.certInfo.extKeyUsage = ekus;
      }

      const bcExt: any = parsedCert.getExtension('basicConstraints');
      if (bcExt) this.certInfo.isCa = !!bcExt.cA;

      this.certInfo.pemBytes = new Blob([cert]).size;
    } catch (err: any) {
      if (/OID is not RSA/i.test(err?.message)) {
        this.certInfo.message = 'Unsupported key type';
        this.certInfo.error = 'This appears to be an ECDSA/EdDSA certificate. node-forge can only parse RSA certificates; EC/Ed certs are not supported.';
      } else {
        this.certInfo.message = 'Error parsing certificate';
        this.certInfo.error = err?.message || 'Unknown error';
      }
    }
  }

  loadSample(): void {
    // A throwaway self-signed cert for demo purposes (Let's Encrypt R3 intermediate, public, expired).
    this.encodedCert = `-----BEGIN CERTIFICATE-----
MIIFFjCCAv6gAwIBAgIRAJErCErPDBinU/bWLiWnX1owDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMjAwOTA0MDAwMDAw
WhcNMjUwOTE1MTYwMDAwWjAyMQswCQYDVQQGEwJVUzEWMBQGA1UEChMNTGV0J3Mg
RW5jcnlwdDELMAkGA1UEAxMCUjMwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQC7AhUozPaglNMPEuyNVZLD+ILxmaZ6QoinXSaqtSu5xUyxr45r+XXIo9cP
R5QUVTVXjJ6oojkZ9YI8QqlObvU7wy7bjcCwXPNZOOftz2nwWgsbvsCUJCWH+jdx
sxPnHKzhm+/b5DtFUkWWqcFTzjTIUu61ru2P3mBw4qVUq7ZtDpelQDRrK9O8Zutm
NHz6a4uPVymZ+DAXXbpyb/uBxa3Shlg9F8fnCbvxK/eG3MHacV3URuPMrSXBiLxg
Z3Vms/EY96Jc5lP/Ooi2R6X/ExjqmAl3P51T+c8B5fWmcBcUr2Ok/5mzk53cU6cG
/kiFHaFpriV1uxPMUgP17VGhi9sVAgMBAAGjggEIMIIBBDAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0lBBYwFAYIKwYBBQUHAwIGCCsGAQUFBwMBMBIGA1UdEwEB/wQIMAYB
Af8CAQAwHQYDVR0OBBYEFBQusxe3WFbLrlAJQOYfr52LFMLGMB8GA1UdIwQYMBaA
FHm0WeZ7tuXkAXOACIjIGlj26ZtuMDIGCCsGAQUFBwEBBCYwJDAiBggrBgEFBQcw
AoYWaHR0cDovL3gxLmkubGVuY3Iub3JnLzAnBgNVHR8EIDAeMBygGqAYhhZodHRw
Oi8veDEuYy5sZW5jci5vcmcvMCIGA1UdIAQbMBkwCAYGZ4EMAQIBMA0GCysGAQQB
gt8TAQEBMA0GCSqGSIb3DQEBCwUAA4ICAQCFyk5HPqP3hUSFvNVneLKYY611TR6W
PTNlclQtgaDqw+34IL9fzLdwALduO/ZelN7kIJ+m74uyA+eitRY8kc607TkC53wl
ikfmZW4/RvTZ8M6UK+5UzhK8jCdLuMGYL6KvzXGRSgi3yLgjewQtCPkIVz6D2QQz
CkcheAmCJ8MqyJu5zlzyZMjAvnnAT45tRAxekrsu94sQ4egdRCnbWSDtY7kh+BIm
lJNXoB1lBMEKIq4QDUOXoRgffuDghje1WrG9ML+Hbisq/yFOGwXD9RiX8F6sw6W4
avAuvDszue5L3sz85K+EC4Y/wFVDNvZo4TYXao6Z0f+lQKc0t8DQYzk1OXVu8rp2
yJMC6alLbBfODALZvYH7n7do1AZls4I9d1P4jnkDrQoxB3UqQ9hVl3LEKQ73xF1O
yK5GhDDX8oVfGKF5u+decIsH4YaTw7mP3GFxJSqv3+0lUFJoi5Lc5da149p90Ids
hCExroL1+7mryIkXPeFM5TgO9r0rvZaBFOvV2z0gp35Z0+L4WPlbuEjN/lxPFin+
HlUjr8gRsI3qfJOQFy/9rKIJR0Y/8Omwt/8oTWgy1mdeHmmjk7j1nYsvC9JSQ6Zv
MldlTTKB3zhThV1+XWYp6rjd5JW1zbVWEkLNxE7GJThEUG3szgBVGP7pSWTUTsqX
nLRbwHOoq7hHwg==
-----END CERTIFICATE-----`;
    this.decode();
  }

  clear(): void {
    this.encodedCert = '';
    this.certInfo = {};
  }

  get isExpired(): boolean {
    return !!this.certInfo.validTill && this.certInfo.validTill.getTime() < Date.now();
  }

  get isExpiringSoon(): boolean {
    if (!this.certInfo.validTill || this.isExpired) return false;
    const days = (this.certInfo.validTill.getTime() - Date.now()) / 86400000;
    return days < 30;
  }

  get isNotYetValid(): boolean {
    return !!this.certInfo.validFrom && this.certInfo.validFrom.getTime() > Date.now();
  }

  get daysRemaining(): number {
    if (!this.certInfo.validTill) return 0;
    return Math.round((this.certInfo.validTill.getTime() - Date.now()) / 86400000);
  }

  saveAsFile(): void {
    this.utilityService.downloadFile(
      JSON.stringify(this.certInfo, undefined, 4),
      'application/json',
      this.context.filename
    );
  }

  copyField(value: any, label: string): void {
    if (value === undefined || value === null) return;
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.utilityService.copyToClipboard(text, { label: `${label} copied` });
  }
}
