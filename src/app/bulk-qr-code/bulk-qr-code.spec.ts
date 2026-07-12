import { unzipSync } from 'fflate';
import { BulkQrCode } from './bulk-qr-code';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('BulkQrCode', () => {
  let component: BulkQrCode;
  let utilityService: UtilityService;

  beforeEach(() => {
    utilityService = new UtilityService({} as ToastService);
    component = new BulkQrCode(utilityService, {} as ToastService);
  });

  it('should parse headers and data rows', () => {
    component.parseTable('name,url\nDocs,https://example.com/docs\nHome,https://example.com');

    expect(component.headers).toEqual(['name', 'url']);
    expect(component.rows.length).toBe(2);
    expect(component.validRowCount).toBe(2);
  });

  it('should create collision-safe names', () => {
    component.outputFormat = 'svg';
    const usedNames = new Set<string>();

    expect(component.makeOutputName('Product', usedNames)).toBe('Product.svg');
    expect(component.makeOutputName('Product', usedNames)).toBe('Product-2.svg');
  });

  it('should generate named SVG QR codes in a ZIP', async () => {
    const downloadSpy = spyOn(utilityService, 'downloadBlob');
    component.parseTable('name,url\nDocs,https://example.com/docs\nHome,https://example.com');
    component.payloadColumn = 1;
    component.nameColumn = 0;
    component.outputFormat = 'svg';

    await component.generateZip();

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [archive, name] = downloadSpy.calls.mostRecent().args;
    const entries = unzipSync(new Uint8Array(await archive.arrayBuffer()));
    expect(name).toBe('qr-codes.zip');
    expect(Object.keys(entries).sort()).toEqual(['Docs.svg', 'Home.svg']);
    expect(new TextDecoder().decode(entries['Docs.svg'])).toContain('<svg');
  });
});