'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { mountProcessLitePanel } from './process-lite-ui.js';

runOnKintonePage(mountProcessLitePanel);
