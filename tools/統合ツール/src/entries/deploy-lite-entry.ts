'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { mountDeployLitePanel } from './deploy-lite-ui.js';

runOnKintonePage(mountDeployLitePanel);
