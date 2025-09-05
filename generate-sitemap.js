// generate-sitemap.js

const admin = require('firebase-admin');
const fs = require('fs');
require('dotenv').config(); 

// Firebase Admin SDK शुरू करें
// यह भी Netlify Environment Variables का उपयोग करेगा
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  // आपकी databaseURL यहाँ अपडेट कर दी गई है
  databaseURL: "https://easyfind-am0cd-default-rtdb.firebaseio.com"
});

async function createSitemap() {
  try {
    const db = admin.database();
    const snapshot = await db.ref('shops').once('value');
    const shops = snapshot.val();
    const slugs = Object.keys(shops);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${slugs
    .map(slug => `
  <url>
    <loc>https://yourwebsite.com/shop/${slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    .join('')}
</urlset>`;

    // सुनिश्चित करें कि आपकी पब्लिश डायरेक्टरी 'public' है, या इसे बदलें
    if (!fs.existsSync('public')){
      fs.mkdirSync('public');
    }
    fs.writeFileSync('public/sitemap.xml', sitemap);
    console.log('Sitemap generated successfully!');
  } catch (error) {
    console.error('Error generating sitemap:', error);
  } finally {
    // प्रोसेस को समाप्त करने के लिए कनेक्शन बंद करें
    admin.app().delete();
  }
}

createSitemap();