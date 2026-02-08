#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkEnvironmentVariables(): void {
  // Multi-site mode: sites file or inline JSON provides all credentials
  if (process.env.WORDPRESS_SITES_FILE || process.env.WORDPRESS_SITES) {
    return;
  }

  // Single-site mode: accept either naming convention
  const hasUrl =
    process.env.WORDPRESS_API_URL || process.env.WORDPRESS_BASE_URL;
  const hasUser = process.env.WORDPRESS_USERNAME;
  const hasPass =
    process.env.WORDPRESS_PASSWORD ||
    process.env.WORDPRESS_APP_PASSWORD ||
    process.env.WORDPRESS_APPLICATION_PASSWORD;

  const missing: string[] = [];
  if (!hasUrl) missing.push('WORDPRESS_API_URL');
  if (!hasUser) missing.push('WORDPRESS_USERNAME');
  if (!hasPass) missing.push('WORDPRESS_PASSWORD');

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  // Check for .env file
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.warn('No .env file found. Using environment variables.');
  }

  checkEnvironmentVariables();

  const serverPath = path.join(__dirname, 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: process.env,
  });

  serverProcess.on('close', (code) => {
    process.exit(code ?? 1);
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => serverProcess.kill());
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
