import { TestBed } from '@angular/core/testing';

import { ToolsService } from './tools.service';

describe('ToolsService', () => {
  let service: ToolsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToolsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('finds a tool by name', () => {
    const routes = service.searchTools('base64').map(t => t.route);
    expect(routes).toContain('/base64');
  });

  it('searches case-insensitively across keywords', () => {
    const routes = service.searchTools('LLM').map(t => t.route);
    expect(routes).toContain('/localAi');
    expect(routes).toContain('/tokenCounter');
  });

  it('returns the full set for an empty or whitespace query', () => {
    const total = service.getAllTools().length;
    expect(service.searchTools('').length).toBe(total);
    expect(service.searchTools('   ').length).toBe(total);
  });

  it('returns only featured tools from getFeaturedTools', () => {
    expect(service.getFeaturedTools().every(t => t.featured === true)).toBeTrue();
  });

  it('every tool has a unique, non-empty route', () => {
    const routes = service.getAllTools().map(t => t.route);
    expect(routes.every(r => typeof r === 'string' && r.length > 0)).toBeTrue();
    expect(new Set(routes).size).toBe(routes.length);
  });
});
