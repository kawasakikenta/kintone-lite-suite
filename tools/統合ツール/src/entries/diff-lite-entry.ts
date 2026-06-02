'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { runDiffStandalone } from '../tabs/diff-standalone.js';
import { mountDiffLitePanel } from './diff-lite-ui.js';

runOnKintonePage(() => mountDiffLitePanel(runDiffStandalone));
