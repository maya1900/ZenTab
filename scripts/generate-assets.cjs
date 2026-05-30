const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function main() {
  // Icon SVG
  const iconSvg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
         <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stop-color="#2D3748" />
           <stop offset="100%" stop-color="#1A202C" />
         </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="224" fill="url(#bg)" />
      <!-- Minimalist lotus/zen leaves -->
      <g transform="translate(512, 512) scale(1.2) translate(-512, -512)" fill="none" stroke="#E2E8F0" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
        <path d="M512 700 C512 700 300 650 300 450 C300 350 400 300 512 350 C624 300 724 350 724 450 C724 650 512 700 512 700 Z" />
        <path d="M512 700 C512 700 380 680 380 500 C380 430 450 380 512 400 C574 380 644 430 644 500 C644 680 512 700 512 700 Z" fill="#E2E8F0" fill-opacity="0.1" />
        <path d="M512 400 L512 650" />
      </g>
    </svg>
  `;

  // Promo Tile SVG (440x280)
  const promoSvg = `
    <svg width="440" height="280" viewBox="0 0 440 280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="440" height="280" fill="url(#grad)" />
      
      <!-- Icon -->
      <g transform="translate(196, 60) scale(0.046875)">
        <rect width="1024" height="1024" rx="224" fill="#2d3748" />
        <g fill="none" stroke="#e2e8f0" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" transform="translate(512, 512) scale(1.2) translate(-512, -512)">
          <path d="M512 700 C512 700 300 650 300 450 C300 350 400 300 512 350 C624 300 724 350 724 450 C724 650 512 700 512 700 Z" />
          <path d="M512 700 C512 700 380 680 380 500 C380 430 450 380 512 400 C574 380 644 430 644 500 C644 680 512 700 512 700 Z" fill="#E2E8F0" fill-opacity="0.1" />
          <path d="M512 400 L512 650" />
        </g>
      </g>
      
      <!-- Text -->
      <text x="220" y="165" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="#f8fafc" text-anchor="middle" letter-spacing="1">ZenTab</text>
      <text x="220" y="195" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="400" fill="#94a3b8" text-anchor="middle" letter-spacing="0.5">Find focus and peace in your browser.</text>
    </svg>
  `;

  const iconBuffer = Buffer.from(iconSvg);
  const promoBuffer = Buffer.from(promoSvg);

  // Ensure directories exist
  if (!fs.existsSync('public')) fs.mkdirSync('public', {recursive: true});
  if (!fs.existsSync('assets')) fs.mkdirSync('assets', {recursive: true});

  // Generate web extension icons
  await sharp(iconBuffer).resize(16, 16).png().toFile('public/icon16.png');
  console.log('✅ Created public/icon16.png');
  await sharp(iconBuffer).resize(48, 48).png().toFile('public/icon48.png');
  console.log('✅ Created public/icon48.png');
  await sharp(iconBuffer).resize(128, 128).png().toFile('public/icon128.png');
  console.log('✅ Created public/icon128.png');
  
  // High-res icon for Store Listing
  await sharp(iconBuffer).resize(128, 128).png().toFile('assets/store_icon_128x128.png');
  console.log('✅ Created assets/store_icon_128x128.png');

  // Promo Tile
  await sharp(promoBuffer).resize(440, 280).png().toFile('assets/promo_tile_440x280.png');
  console.log('✅ Created assets/promo_tile_440x280.png');

  console.log("🎉 All assets generated successfully!");
}

main().catch(console.error);
