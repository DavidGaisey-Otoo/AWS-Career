#!/usr/bin/env node
import { runAllInvoiceTests, printInvoiceReport } from '../src/lib/invoiceAgents/__tests__/testRunner.js';
const report = runAllInvoiceTests();
console.log(printInvoiceReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
