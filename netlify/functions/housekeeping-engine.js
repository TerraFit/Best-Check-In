// netlify/functions/housekeeping-engine.js
// Shared schedule logic was inlined into generate-housekeeping-tasks.js so this
// file is no longer required as a module (avoids HandlerNotFound under type:module + esbuild).
// Exports a valid handler so Netlify does not report handler undefined if this path is scanned.

exports.handler = async () => {
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      error: 'Not a public endpoint. Use generate-housekeeping-tasks.',
    }),
  };
};
