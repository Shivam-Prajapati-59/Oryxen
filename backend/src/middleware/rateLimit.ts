import rateLimit from "express-rate-limit";

// Applies a strict rate limit for connection flooding
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 120, // Limit each IP to 120 requests per `window` (here, per 1 minute)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
});

// A slightly heavier rate limit for sync routes that do data-heavy computations
export const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 sync triggers per 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Sync rate limit exceeded. Please try again later.",
  },
});
