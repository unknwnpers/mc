import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Replay configuration
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Filter out known noise
  ignoreErrors: [
    // Browser extensions
    "Non-Error promise rejection captured",
    "Network request failed",
    "Failed to fetch",
    // Common browser issues
    "ResizeObserver loop",
    "window.matchMedia",
    // Firebase temporary errors
    "auth/too-many-requests",
  ],
});
