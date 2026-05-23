import { FeatureModule } from '../../registry.js';
import { state } from '../../state.js';

export const apiTesterState = {
  // TODO: Add feature-specific state here during migration
};

export const apiTesterFeature: FeatureModule = {
  id: 'apiTester',
  
  init() {
    console.log('[ApiTesterFeature] Initialized');
  },

  registerEvents(rootElement: HTMLElement) {
    // console.log('[ApiTesterFeature] Events scaffolded');
    // TODO: Move event listeners from handlers.ts to here
  }
};
