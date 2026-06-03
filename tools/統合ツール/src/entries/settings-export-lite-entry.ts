'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { mountSettingsExportLitePanel } from './settings-export-lite-ui.js';

runOnKintonePage(mountSettingsExportLitePanel);
