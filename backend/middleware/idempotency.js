const NodeCache = require('node-cache');
// Cache responses for 120 seconds (2 minutes) to prevent accidental double-submits
const idempotencyCache = new NodeCache({ stdTTL: 120, checkperiod: 30 });

/**
 * Idempotency Middleware:
 * Checks for 'x-idempotency-key' in request headers.
 * If present and previously seen, returns the cached response with zero database work.
 * If new, intercepts the JSON response and caches it.
 */
const idempotency = (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key || req.method === 'GET') {
    return next();
  }

  const cached = idempotencyCache.get(key);
  if (cached) {
    return res.status(cached.status).json(cached.body);
  }

  // Intercept json response
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      idempotencyCache.set(key, { status: res.statusCode, body });
    }
    return originalJson(body);
  };

  next();
};

module.exports = idempotency;
