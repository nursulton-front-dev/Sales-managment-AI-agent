const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const SPARROW_DIR = path.join(__dirname, '..', 'public', 'illustrations', 'gapcha', 'sparrow');

const POSES = [
  { name: 'idle', size: 512 },
  { name: 'hello', size: 512 },
  { name: 'thinking', size: 512 },
  { name: 'success', size: 512 },
  { name: 'hint', size: 512 },
  { name: 'help', size: 512 },
  { name: 'flying', size: 512 },
  { name: 'avatar', size: 512 },
  { name: 'avatar', size: 64, suffix: '-64' },
  { name: 'avatar', size: 32, suffix: '-32' },
  { name: 'avatar', size: 24, suffix: '-24' },
];

async function generatePngs() {
  console.log('Rendering SVGs to transparent PNGs using headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    headless: true,
  });

  const page = await browser.newPage();

  for (const item of POSES) {
    const svgPath = path.join(SPARROW_DIR, `${item.name}.svg`);
    if (!fs.existsSync(svgPath)) {
      console.error(`SVG not found: ${svgPath}`);
      continue;
    }

    const svgContent = fs.readFileSync(svgPath, 'utf8');
    const outName = `${item.name}${item.suffix || ''}.png`;
    const outPath = path.join(SPARROW_DIR, outName);

    await page.setViewport({ width: item.size, height: item.size, deviceScaleFactor: 2 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: ${item.size}px;
              height: ${item.size}px;
              background: transparent !important;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: ${item.size}px;
              height: ${item.size}px;
              display: block;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `, { waitUntil: 'load' });

    await page.screenshot({
      path: outPath,
      omitBackground: true,
      type: 'png',
    });

    console.log(`✅ Generated ${outName} (${item.size}x${item.size})`);
  }

  await browser.close();
  console.log('🎉 All sparrow PNG assets generated successfully.');
}

generatePngs().catch((err) => {
  console.error('Error generating PNGs:', err);
  process.exit(1);
});
