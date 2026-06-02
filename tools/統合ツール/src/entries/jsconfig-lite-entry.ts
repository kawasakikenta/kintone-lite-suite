'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { mountJsconfigLitePanel } from './jsconfig-lite-ui.js';

runOnKintonePage(mountJsconfigLitePanel);
