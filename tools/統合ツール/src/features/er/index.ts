import { FeatureModule } from '../../registry.js';
import { state } from '../../state.js';

export const erState = {
  // TODO: Add feature-specific state here during migration
};

export const erFeature: FeatureModule = {
  id: 'er',
  
  init() {
    console.log('[ERFeature] Initialized');
  },

  registerEvents(rootElement: HTMLElement) {
    // console.log('[ERFeature] Events scaffolded');
    // TODO: Move event listeners from handlers.ts to here
  }
};
