const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '../..', '..');

function selectExports(moduleExports, exportNames) {
  return Object.fromEntries(exportNames.map((name) => [name, moduleExports[name]]));
}

function loadCommonJsExports(relativeFile, exportNames, { stubAuth = false } = {}) {
  const filePath = path.join(ROOT, relativeFile);
  const source = fs.readFileSync(filePath, 'utf8');
  const module = { exports: {} };
  const nativeRequire = createRequire(path.resolve(filePath));
  const requireForFile = (request) => {
    if (stubAuth && request === './_housekeepingServiceAuth.cjs') {
      return {
        authenticateHousekeepingServiceLive: async () => ({ ok: true }),
        resolveBusinessId: (_principal, businessId) => ({ ok: true, businessId }),
      };
    }
    return nativeRequire(request);
  };

  const sandbox = {
    module,
    exports: module.exports,
    require: requireForFile,
    console,
    process,
    Buffer,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  vm.runInNewContext(source, sandbox, { filename: filePath });
  return selectExports(module.exports, exportNames);
}

function loadTypeScriptExports(relativeFile, exportNames) {
  const filePath = path.join(ROOT, relativeFile);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const nativeRequire = createRequire(path.resolve(filePath));
  const sandbox = {
    module,
    exports: module.exports,
    require: nativeRequire,
    console,
    process,
  };
  vm.runInNewContext(compiled, sandbox, { filename: filePath });
  return selectExports(module.exports, exportNames);
}

const stayDates = loadCommonJsExports('netlify/functions/lib/stayDates.js', [
  'calculateCheckOutDate',
  'normalizeNights',
  'parseIsoDate',
]);

const housekeepingGenerator = loadCommonJsExports(
  'netlify/functions/generate-housekeeping-tasks.js',
  ['generateSchedule', 'serviceForToday'],
  { stubAuth: true }
);

const housekeepingDefinitions = loadTypeScriptExports(
  'src/services/housekeepingServiceDefinitions.ts',
  ['getHousekeepingChecklist', 'getChecklistItemIds', 'createInitialChecklistState']
);

const issueTypes = loadTypeScriptExports('src/types/housekeepingIssues.ts', [
  'HOUSEKEEPING_ISSUE_CATALOG',
  'getIssueOption',
]);

function readSource(relativeFile) {
  return fs.readFileSync(path.join(ROOT, relativeFile), 'utf8');
}

