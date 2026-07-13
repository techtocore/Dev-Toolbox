import { APP_ROUTES } from './app-routing.module';
import { ToolsService } from './services/tools.service';

describe('application route catalog', () => {
  it('keeps every catalog tool and concrete tool route in sync', () => {
    const catalogPaths = new ToolsService()
      .getAllTools()
      .map(tool => tool.route.replace(/^\//, ''))
      .sort();
    const routePaths = APP_ROUTES
      .filter(route => route.path && route.path !== '**')
      .map(route => route.path as string)
      .sort();

    expect(routePaths).toEqual(catalogPaths);
  });
});