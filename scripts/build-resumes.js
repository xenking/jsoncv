#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resumesDir = path.join(process.cwd(), 'resumes');
const distDir = path.join(process.cwd(), 'dist');
const distResumesDir = path.join(distDir, 'resume');

if (!fs.existsSync(resumesDir)) {
  console.error('Error: resumes/ directory not found');
  process.exit(1);
}

if (!fs.existsSync(distResumesDir)) {
  fs.mkdirSync(distResumesDir, { recursive: true });
}

// Check if Cloudflare Browser Rendering API credentials are available
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const USE_CF_BROWSER_RENDERING = CF_ACCOUNT_ID && CF_API_TOKEN;

// Helper to add delay between API calls
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generatePDFWithCloudflare(htmlContent, pdfPath, retries = 3) {
  const makeRequest = async () => {
    return fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/browser-rendering/pdf`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          html: htmlContent,
          pdfOptions: {
            format: 'a4',
            margin: {
              top: '10mm',
              right: '12mm',
              bottom: '10mm',
              left: '12mm'
            },
            printBackground: true
          }
        })
      }
    );
  };

  let response = await makeRequest();
  
  // Handle rate limiting with Retry-After header
  let attempt = 0;
  while (response.status === 429 && attempt < retries) {
    const retryAfter = response.headers.get('Retry-After') || '10';
    const waitTime = parseInt(retryAfter, 10) * 1000;
    console.log(`   ⏳ Rate limited. Waiting ${retryAfter} seconds...`);
    await delay(waitTime);
    response = await makeRequest();
    attempt++;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(pdfPath, Buffer.from(buffer));
}

async function generatePDFWithPuppeteer(htmlPath, pdfPath) {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '10mm',
        right: '12mm',
        bottom: '10mm',
        left: '12mm'
      },
      printBackground: true
    });
  } finally {
    await browser.close();
  }
}

async function generatePDF(htmlPath, pdfPath) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  if (USE_CF_BROWSER_RENDERING) {
    await generatePDFWithCloudflare(htmlContent, pdfPath);
  } else {
    await generatePDFWithPuppeteer(htmlPath, pdfPath);
  }
}

console.log('📦 Building all resume versions...\n');
if (USE_CF_BROWSER_RENDERING) {
  console.log('🌐 Using Cloudflare Browser Rendering API for PDF generation\n');
} else {
  console.log('🖥️  Using local Puppeteer for PDF generation\n');
}

// Get the primary resume name from environment (displayed at /)
const PRIMARY_RESUME_NAME = process.env.RESUME_NAME;

let resumeFiles = fs.readdirSync(resumesDir)
  .filter(file => file.endsWith('.json'));

if (resumeFiles.length === 0) {
  console.warn('⚠️  No resume files found in resumes/');
  process.exit(0);
}

// Prioritize the primary resume (RESUME_NAME) to be built first
if (PRIMARY_RESUME_NAME) {
  const primaryFile = resumeFiles.find(f => {
    const data = JSON.parse(fs.readFileSync(path.join(resumesDir, f), 'utf8'));
    return data.meta && data.meta.name === PRIMARY_RESUME_NAME;
  });
  if (primaryFile) {
    resumeFiles = [primaryFile, ...resumeFiles.filter(f => f !== primaryFile)];
    console.log(`⭐ Prioritizing primary resume: ${PRIMARY_RESUME_NAME}\n`);
  }
}

let builtCount = 0;

(async () => {
for (const file of resumeFiles) {
  const resumePath = path.join(resumesDir, file);
  const resumeData = JSON.parse(fs.readFileSync(resumePath, 'utf8'));
  
  if (!resumeData.meta || !resumeData.meta.name) {
    console.warn(`⚠️  Skipping ${file}: no meta.name field`);
    continue;
  }
  
  const resumeName = resumeData.meta.name;
  const theme = resumeData.meta.theme || 'xenking';
  const baseFilename = file.replace('.json', '');
  
  console.log(`🔨 Building: ${file}`);
  console.log(`   Resume name: ${resumeName}`);
  console.log(`   Theme: ${theme}`);
  
  // Copy JSON to dist/resume/
  const jsonDestPath = path.join(distResumesDir, file);
  fs.copyFileSync(resumePath, jsonDestPath);
  console.log(`   JSON: /resume/${file}`);
  
  // Build HTML version
  const htmlFilename = baseFilename + '.html';
  const htmlDestPath = path.join(distResumesDir, htmlFilename);
  const tempOutDir = path.join(process.cwd(), '.tmp-build', baseFilename);
  
  try {
    // Build HTML using vite with theme from resume meta
    const siteUrl = process.env.SITE_URL || 'xenking.pro';
    execSync(
      `DATA_FILENAME="${resumePath}" OUT_DIR="${tempOutDir}" THEME="${theme}" SITE_URL="${siteUrl}" pnpm run build`,
      { stdio: 'pipe', encoding: 'utf8' }
    );
    
    // Copy built HTML to dist/resume/
    const builtHtmlPath = path.join(tempOutDir, 'index.html');
    if (fs.existsSync(builtHtmlPath)) {
      fs.copyFileSync(builtHtmlPath, htmlDestPath);
      console.log(`   HTML: /resume/${htmlFilename}`);
      
      // Generate PDF from HTML
      const pdfFilename = resumeData.meta.version 
        ? `${resumeName}-${resumeData.meta.version}.pdf`
        : `${resumeName}.pdf`;
      const pdfDestPath = path.join(distDir, pdfFilename);
      
      await generatePDF(htmlDestPath, pdfDestPath);
      console.log(`   PDF: /${pdfFilename}`);
      
      // Add delay between API calls to avoid rate limiting (10 seconds recommended by CF docs)
      if (USE_CF_BROWSER_RENDERING) {
        await delay(10000);
      }
    } else {
      console.warn(`   ⚠️  HTML build not found: ${builtHtmlPath}`);
    }
    
    // Clean up temp dir
    fs.rmSync(tempOutDir, { recursive: true, force: true });
    
  } catch (error) {
    console.error(`   ❌ Failed to build HTML/PDF: ${error.message}`);
  }
  
  builtCount++;
  console.log('');
}

// Clean up .tmp-build directory
const tmpBuildDir = path.join(process.cwd(), '.tmp-build');
if (fs.existsSync(tmpBuildDir)) {
  fs.rmSync(tmpBuildDir, { recursive: true, force: true });
}

console.log(`Built ${builtCount} resume(s)`);
console.log('');
console.log('📋 Resume URLs:');

const domain = process.env.DOMAIN || 'cv.xenking.pro';
const latestResumes = resumeFiles.filter(f => !f.match(/\.\d{4}-\d{2}-\d{2}T/));
for (const file of latestResumes) {
  const resumeData = JSON.parse(fs.readFileSync(path.join(resumesDir, file), 'utf8'));
  if (resumeData.meta && resumeData.meta.name) {
    const baseFilename = file.replace('.json', '');
    const pdfFilename = resumeData.meta.version 
      ? `${resumeData.meta.name}-${resumeData.meta.version}.pdf`
      : `${resumeData.meta.name}.pdf`;
    console.log(`   ${resumeData.meta.name}:`);
    console.log(`     JSON: https://${domain}/resume/${file}`);
    console.log(`     HTML: https://${domain}/resume/${baseFilename}.html`);
    console.log(`     PDF: https://${domain}/${pdfFilename}`);
  }
}
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
