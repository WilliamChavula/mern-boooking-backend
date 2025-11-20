import helmet from "helmet";
import { config } from "../config";

/**
 * Helmet security middleware configuration
 * Provides secure HTTP headers
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: true,

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: { policy: "same-origin" },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: "same-origin" },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frameguard (X-Frame-Options)
  frameguard: { action: "deny" },

  // Hide Powered-By header
  hidePoweredBy: true,

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // IE No Open
  ieNoOpen: true,

  // Don't Sniff Mimetype
  noSniff: true,

  // Origin-Agent-Cluster
  originAgentCluster: true,

  // Permitted Cross-Domain Policies
  permittedCrossDomainPolicies: { permittedPolicies: "none" },

  // Referrer Policy
  referrerPolicy: { policy: "no-referrer" },

  // X-XSS-Protection
  xssFilter: true,
});

/**
 * Helmet configuration for development
 * Less strict for easier debugging
 */
export const helmetDevConfig = helmet({
  contentSecurityPolicy: false, // Disable CSP in development
  hsts: false, // Disable HSTS in development
  hidePoweredBy: true,
  frameguard: { action: "deny" },
  noSniff: true,
  xssFilter: true,
});

/**
 * Get appropriate helmet configuration based on environment
 */
export const getHelmetConfig = () => {
  return config.NODE_ENV === "production" ? helmetConfig : helmetDevConfig;
};
