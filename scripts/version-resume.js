#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
  console.error('Usage: node version-resume.js <path-to-new-resume.json>');
  process.exit(1);
}

const newResumeFile = process.argv[2];

if (!fs.existsSync(newResumeFile)) {
  console.error(`Error: File not found: ${newResumeFile}`);
  process.exit(1);
}

const resumesDir = path.join(process.cwd(), 'resumes');

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

const newResumeData = JSON.parse(fs.readFileSync(newResumeFile, 'utf8'));

if (!newResumeData.meta || !newResumeData.meta.name) {
  console.error('Error: Resume must have meta.name field');
  process.exit(1);
}

const resumeName = newResumeData.meta.name;
const latestFilename = `${resumeName}.json`;
const latestPath = path.join(resumesDir, latestFilename);

console.log(`📄 Resume name: ${resumeName}`);
console.log(`📁 Resumes directory: ${resumesDir}`);

if (fs.existsSync(latestPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const versionedFilename = `${resumeName}.${timestamp}.json`;
  const versionedPath = path.join(resumesDir, versionedFilename);
  
  console.log(`📦 Backing up existing resume to: ${versionedFilename}`);
  fs.copyFileSync(latestPath, versionedPath);
  
  console.log(`✅ Backup created: ${versionedFilename}`);
} else {
  console.log('ℹ️  No existing resume found (first version)');
}

console.log(`⬆️  Copying new resume to: ${latestFilename}`);
fs.copyFileSync(newResumeFile, latestPath);

console.log('');
console.log('✅ Resume versioned successfully!');
console.log('');
console.log('📋 URLs will be:');
const domain = process.env.DOMAIN || 'your-domain.com';
console.log(`   Latest JSON: https://${domain}/resume/${resumeName}.json`);
console.log(`   Latest HTML: https://${domain}/`);
console.log('');
console.log('💡 Run "npm run build-all" to build HTML versions');
