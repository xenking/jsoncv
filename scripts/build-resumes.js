#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

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

async function generatePDF(htmlPath, pdfPath) {
  const browser = await puppeteer.launch({
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

console.log('📦 Building all resume versions...\n');

const resumeFiles = fs.readdirSync(resumesDir)
  .filter(file => file.endsWith('.json'));

if (resumeFiles.length === 0) {
  console.warn('⚠️  No resume files found in resumes/');
  process.exit(0);
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
  console.log(`   ✅ JSON: /resume/${file}`);
  
  // Build HTML version
  const htmlFilename = baseFilename + '.html';
  const htmlDestPath = path.join(distResumesDir, htmlFilename);
  const tempOutDir = path.join(process.cwd(), '.tmp-build', baseFilename);
  
  try {
    // Build HTML using vite with theme from resume meta
    execSync(
      `DATA_FILENAME="${resumePath}" OUT_DIR="${tempOutDir}" THEME="${theme}" npm run build`,
      { stdio: 'pipe', encoding: 'utf8' }
    );
    
    // Copy built HTML to dist/resume/
    const builtHtmlPath = path.join(tempOutDir, 'index.html');
    if (fs.existsSync(builtHtmlPath)) {
      fs.copyFileSync(builtHtmlPath, htmlDestPath);
      console.log(`   ✅ HTML: /resume/${htmlFilename}`);
      
      // Generate PDF from HTML
      const pdfFilename = resumeData.meta.version 
        ? `${resumeName}-${resumeData.meta.version}.pdf`
        : `${resumeName}.pdf`;
      const pdfDestPath = path.join(distDir, pdfFilename);
      
      await generatePDF(htmlDestPath, pdfDestPath);
      console.log(`   ✅ PDF: /${pdfFilename}`);
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

console.log(`✅ Built ${builtCount} resume(s)`);
console.log('');
console.log('📋 Resume URLs:');

const domain = process.env.DOMAIN || 'your-domain.com';
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
