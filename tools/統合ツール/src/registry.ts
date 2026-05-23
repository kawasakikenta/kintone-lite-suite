export interface FeatureModule {
  id: string;
  init?: () => void;
  registerEvents?: (element: HTMLElement) => void;
  destroy?: () => void;
}

class FeatureRegistry {
  private features: Map<string, FeatureModule> = new Map();

  register(feature: FeatureModule) {
    if (this.features.has(feature.id)) {
      console.warn(`Feature ${feature.id} is already registered.`);
      return;
    }
    this.features.set(feature.id, feature);
  }

  getFeature(id: string): FeatureModule | undefined {
    return this.features.get(id);
  }

  initAll() {
    this.features.forEach(feature => {
      try {
        feature.init?.();
      } catch (e) {
        console.error(`Failed to init feature ${feature.id}`, e);
      }
    });
  }

  registerEventsAll(element: HTMLElement) {
    this.features.forEach(feature => {
      try {
        feature.registerEvents?.(element);
      } catch (e) {
        console.error(`Failed to register events for feature ${feature.id}`, e);
      }
    });
  }
}

export const registry = new FeatureRegistry();
