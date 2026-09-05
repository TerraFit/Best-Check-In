// Backwards-compatible SuperAdmin adapter.
// Authentication is implemented only in _auth.cjs so platform endpoints share
// one JWT verification and identity model.
const { requireSuperAdmin: authenticateSuperAdmin, authFailure } = require('./_auth.cjs');

function requireSuperAdmin(event) {
  return authenticateSuperAdmin(event);
}

module.exports = { requireSuperAdmin, authFailure };
