import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  console.log('🚀 PDFを生成しています...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const htmlPath = 'file://' + path.resolve(__dirname, 'manual.html');
  
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  
  await page.pdf({
    path: 'WannaV_使い方マニュアル.pdf',
    format: 'A4',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground: true
  });
  
  await browser.close();
  
  console.log('✅ PDFの生成が完了しました: WannaV_使い方マニュアル.pdf');
})();
