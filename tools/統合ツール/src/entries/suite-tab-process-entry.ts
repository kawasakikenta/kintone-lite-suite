'use strict';

import '../register-api.js';
import { runOnKintonePage } from '../kintoneGuard.js';
import { runKintoneUnifiedSuite } from '../boot.js';

runOnKintonePage(() => runKintoneUnifiedSuite({ initialTab: 'processFlow' }));
