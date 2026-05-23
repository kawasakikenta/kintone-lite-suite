import fs from 'fs';
import path from 'path';

const features = [
  { id: 'reflect', name: 'ReflectFeature', tab: 'reflect' },
  { id: 'field', name: 'FieldFeature', tab: 'field' },
  { id: 'er', name: 'ERFeature', tab: 'er' },
  { id: 'process', name: 'ProcessFeature', tab: 'processFlow' },
  { id: 'analyze', name: 'AnalyzeFeature', tab: 'analyze' },
  { id: 'apiTester', name: 'ApiTesterFeature', tab: 'apiTester' },
  { id: 'jsconfig', name: 'JsConfigFeature', tab: 'jsconfig' },
  { id: 'record', name: 'RecordFeature', tab: 'record' },
  { id: 'design', name: 'DesignFeature', tab: 'design' }
];

for (const f of features) {
  const dir = path.join('src', 'features', f.id);
  fs.mkdirSync(dir, { recursive: true });
  
  const content = `import { FeatureModule } from '../../registry.js';
import { state } from '../../state.js';

export const ${f.id}State = {
  // TODO: Add feature-specific state here during migration
};

export const ${f.id}Feature: FeatureModule = {
  id: '${f.id}',
  
  init() {
    console.log('[${f.name}] Initialized');
  },

  registerEvents(rootElement: HTMLElement) {
    // console.log('[${f.name}] Events scaffolded');
    // TODO: Move event listeners from handlers.ts to here
  }
};
`;

  fs.writeFileSync(path.join(dir, 'index.ts'), content);
  console.log(`Created feature scaffold for: ${f.id}`);
}
