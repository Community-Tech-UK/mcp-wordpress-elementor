import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Global WordPress API client instance
let wpClient: AxiosInstance | undefined;

// --- Multi-site support ---

export interface SiteConfig {
  url: string;
  username: string;
  password: string;
}

/** Registry of configured sites (empty in single-site mode). */
const siteConfigs = new Map<string, SiteConfig>();

/** Name of the currently active site (undefined in single-site mode). */
let activeSiteName: string | undefined;

/** Callbacks invoked when the active site changes, so modules can drop cached clients. */
const ctInvalidationCallbacks: Array<() => void> = [];

/** Register a callback that will be called when the active site changes. */
export function registerCtInvalidation(cb: () => void): void {
  ctInvalidationCallbacks.push(cb);
}

/** Returns true if multi-site configuration is present. */
export function hasMultiSiteConfig(): boolean {
  return !!(process.env.WORDPRESS_SITES_FILE || process.env.WORDPRESS_SITES);
}

/** Load site configs from WORDPRESS_SITES_FILE or WORDPRESS_SITES env var. */
function loadSiteConfigs(): void {
  let raw: string | undefined;

  if (process.env.WORDPRESS_SITES_FILE) {
    const filePath = process.env.WORDPRESS_SITES_FILE;
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sites file not found: ${filePath}`);
    }
    raw = fs.readFileSync(filePath, 'utf-8');
  } else if (process.env.WORDPRESS_SITES) {
    raw = process.env.WORDPRESS_SITES;
  }

  if (!raw) return;

  let parsed: Record<string, { url: string; username: string; password: string }>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Failed to parse site configurations as JSON');
  }

  for (const [name, config] of Object.entries(parsed)) {
    if (!config.url || !config.username || !config.password) {
      throw new Error(`Site "${name}" is missing required fields (url, username, password)`);
    }
    siteConfigs.set(name, {
      url: config.url.replace(/\/$/, ''),
      username: config.username,
      password: config.password,
    });
  }

  if (siteConfigs.size === 0) {
    throw new Error('Sites configuration is empty');
  }
}

/** Create an Axios client for a given site config and verify the connection. */
async function connectToSite(config: SiteConfig): Promise<void> {
  let baseURL = config.url.endsWith('/') ? config.url : `${config.url}/`;
  if (!baseURL.includes('/wp-json/wp/v2')) {
    baseURL = baseURL + 'wp-json/wp/v2/';
  } else if (!baseURL.endsWith('/')) {
    baseURL = baseURL + '/';
  }

  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  const axiosConfig: AxiosRequestConfig & { headers: Record<string, string> } = {
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
  };

  const client = axios.create(axiosConfig);

  try {
    await client.get('');
    logToFile(`Successfully connected to ${config.url}`);
  } catch (error: any) {
    throw new Error(`Failed to connect to ${config.url}: ${error.message}`);
  }

  wpClient = client;
}

/** Switch to a different configured site by name. */
export async function selectSite(name: string): Promise<void> {
  const config = siteConfigs.get(name);
  if (!config) {
    const available = Array.from(siteConfigs.keys()).join(', ');
    throw new Error(`Site "${name}" not found. Available sites: ${available}`);
  }

  await connectToSite(config);
  activeSiteName = name;

  // Invalidate cached CommunityTech clients
  for (const cb of ctInvalidationCallbacks) {
    cb();
  }

  logToFile(`Switched to site: ${name} (${config.url})`);
}

/** Return the list of configured sites and which is active. */
export function listSites(): Array<{ name: string; url: string; active: boolean }> {
  return Array.from(siteConfigs.entries()).map(([name, config]) => ({
    name,
    url: config.url,
    active: name === activeSiteName,
  }));
}

// Resolve log directory relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'wordpress-api.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logToFile(message: string): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * Initialize the WordPress API client with authentication.
 * In multi-site mode, loads site configs and auto-connects to the first site.
 * In single-site mode, uses WORDPRESS_API_URL/USERNAME/PASSWORD env vars.
 */
export async function initWordPress(): Promise<void> {
  // Multi-site mode
  if (hasMultiSiteConfig()) {
    loadSiteConfigs();
    const firstName = siteConfigs.keys().next().value as string;
    await selectSite(firstName);
    logToFile(`Multi-site mode: connected to "${firstName}" (${siteConfigs.size} sites configured)`);
    return;
  }

  // Single-site mode (backwards compatible)
  const apiUrl =
    process.env.WORDPRESS_API_URL || process.env.WORDPRESS_BASE_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword =
    process.env.WORDPRESS_PASSWORD ||
    process.env.WORDPRESS_APP_PASSWORD ||
    process.env.WORDPRESS_APPLICATION_PASSWORD;

  if (!apiUrl) {
    throw new Error(
      'WordPress API URL not found. Set WORDPRESS_API_URL in your environment.'
    );
  }

  let baseURL = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
  if (!baseURL.includes('/wp-json/wp/v2')) {
    baseURL = baseURL + 'wp-json/wp/v2/';
  } else if (!baseURL.endsWith('/')) {
    baseURL = baseURL + '/';
  }

  const config: AxiosRequestConfig & { headers: Record<string, string> } = {
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (username && appPassword) {
    logToFile('Adding authentication headers');
    const auth = Buffer.from(`${username}:${appPassword}`).toString('base64');
    config.headers['Authorization'] = `Basic ${auth}`;
  }

  wpClient = axios.create(config);

  try {
    await wpClient.get('');
    logToFile('Successfully connected to WordPress API');
  } catch (error: any) {
    logToFile(`Failed to connect to WordPress API: ${error.message}`);
    throw new Error(`Failed to connect to WordPress API: ${error.message}`);
  }
}

/** Returns the base URL of the WordPress site (without /wp-json/wp/v2/). */
export function getBaseUrl(): string {
  // In multi-site mode, return the active site's URL
  if (activeSiteName) {
    const config = siteConfigs.get(activeSiteName);
    if (config) return config.url;
  }
  // Single-site fallback
  return (
    process.env.WORDPRESS_API_URL ||
    process.env.WORDPRESS_BASE_URL ||
    ''
  ).replace(/\/$/, '');
}

/** Returns the authenticated axios instance (for direct use by CommunityTech client etc). */
export function getWpClient(): AxiosInstance {
  if (!wpClient) {
    throw new Error('WordPress client not initialized');
  }
  return wpClient;
}

export interface MakeRequestOptions {
  isFormData?: boolean;
  rawResponse?: boolean;
  headers?: Record<string, string>;
}

/**
 * Make a request to the WordPress REST API.
 */
export async function makeWordPressRequest(
  method: string,
  endpoint: string,
  data?: any,
  options?: MakeRequestOptions
): Promise<any> {
  if (!wpClient) {
    throw new Error('WordPress client not initialized');
  }

  if (!options?.isFormData) {
    logToFile(`Data: ${JSON.stringify(data, null, 2)}`);
  } else {
    logToFile('Request contains FormData (not shown in logs)');
  }

  const apiPath = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

  try {
    const fullUrl = `${wpClient.defaults.baseURL}${apiPath}`;
    const requestConfig: AxiosRequestConfig = {
      method,
      url: apiPath,
      headers: options?.headers || {},
    };

    if (method === 'GET') {
      requestConfig.params = data;
    } else if (options?.isFormData) {
      requestConfig.data = data;
    } else if (method === 'POST') {
      requestConfig.data = JSON.stringify(data);
    } else {
      requestConfig.data = data;
    }

    logToFile(
      `REQUEST: ${method} ${fullUrl}\nHeaders: ${JSON.stringify(
        { ...wpClient.defaults.headers, ...requestConfig.headers },
        null,
        2
      )}\nData: ${options?.isFormData ? '(FormData)' : JSON.stringify(data, null, 2)}`
    );

    const response = await wpClient.request(requestConfig);

    logToFile(`RESPONSE: ${response.status}\nData: ${JSON.stringify(response.data, null, 2)}`);

    return options?.rawResponse ? response : response.data;
  } catch (error: any) {
    const errorLog = `ERROR: ${error.message}\nStatus: ${error.response?.status || 'N/A'}\nData: ${JSON.stringify(error.response?.data || {}, null, 2)}`;
    console.error(errorLog);
    logToFile(errorLog);
    throw error;
  }
}

/**
 * Search the WordPress.org Plugin Repository API.
 */
export async function searchWordPressPluginRepository(
  searchQuery: string,
  page: number = 1,
  perPage: number = 10
): Promise<any> {
  try {
    const apiUrl = 'https://api.wordpress.org/plugins/info/1.2/';
    const requestData = {
      action: 'query_plugins',
      request: {
        search: searchQuery,
        page,
        per_page: perPage,
        fields: {
          description: true,
          sections: false,
          tested: true,
          requires: true,
          rating: true,
          ratings: false,
          downloaded: true,
          downloadlink: true,
          last_updated: true,
          homepage: true,
          tags: true,
        },
      },
    };

    logToFile(`WORDPRESS.ORG PLUGIN API REQUEST: ${JSON.stringify(requestData, null, 2)}`);

    const response = await axios.post(apiUrl, requestData, {
      headers: { 'Content-Type': 'application/json' },
    });

    logToFile(
      `WORDPRESS.ORG PLUGIN API RESPONSE: ${response.status}\nPlugins: ${response.data.plugins?.length || 0}`
    );

    return response.data;
  } catch (error: any) {
    const errorLog = `WORDPRESS.ORG PLUGIN API ERROR: ${error.message}\nStatus: ${error.response?.status || 'N/A'}`;
    console.error(errorLog);
    logToFile(errorLog);
    throw error;
  }
}
