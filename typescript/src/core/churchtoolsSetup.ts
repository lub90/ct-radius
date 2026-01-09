// churchtools-setup.js
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Import ChurchTools (CommonJS)
const { ChurchToolsClient, deactivateLogging } = require("@churchtools/churchtools-client");

// Disable ChurchTools logging - yet this function is very buggy and will still print warnings to stderr, but stdout is all that matters for FreeRADIUS
deactivateLogging();

// Optional: silence everything from churchtools if you ever want to
/*
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(" ");
  if (msg.includes("ChurchTools Client:")) return;
  originalWarn(...args);
};
*/

// Cookie jar support
const axiosCookieJarSupport = require("axios-cookiejar-support");
const tough = require("tough-cookie");

// Export everything you need
export {
  ChurchToolsClient,
  axiosCookieJarSupport,
  tough,
};

export type ChurchToolsClientType = InstanceType<typeof ChurchToolsClient>;
