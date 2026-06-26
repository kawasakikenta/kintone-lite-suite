'use strict';

import { runOnKintonePage } from '../kintoneGuard.js';
import { mountCsvExportLitePanel } from './csv-export-lite-ui.js';

runOnKintonePage(mountCsvExportLitePanel);
