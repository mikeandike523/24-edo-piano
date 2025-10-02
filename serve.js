#!/usr/bin/env node
import http from 'http';
import nodeStatic from 'node-static';
import { Command } from 'commander';

const program = new Command();

program
  .option('-p, --port <number>', 'Port to run the server on', '3000')
  .option('--dev', 'Run in development mode')
  .option('--prod', 'Run in production mode')
  .parse(process.argv);

const options = program.opts();
const port = parseInt(options.port, 10);

// Determine environment
let env = process.env.NODE_ENV || 'development';
if (options.dev) env = 'development';
if (options.prod) env = 'production';

const file = new nodeStatic.Server('./', { cache: false }); // Disable internal caching

http.createServer((request, response) => {
  request.addListener('end', () => {
    // Disable browser caching
    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    file.serve(request, response);
  }).resume();
}).listen(port);

let url = `http://localhost:${port}`;
if (env === 'development') {
  url += '?dev=true';
}

console.log(`Server running in ${env} mode at ${url}`);
