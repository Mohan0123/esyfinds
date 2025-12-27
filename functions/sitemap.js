const admin = require('firebase-admin');

// Netlify Key Setup
if (!admin.apps.length) {
  // Phone se key copy karne me dikkat ho sakti hai, isliye replace logic lagaya hai
  const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });
}

const db = admin.firestore();
const BASE_URL = "https://ranginx.fun"; 

const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;

// Helper to escape characters
const esc = (unsafe) => {
    if (!unsafe) return "";
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

exports.handler = async (event, context) => {
  const type = event.queryStringParameters.type || 'index';

  try {
    let xmlContent = "";

    // 1. MASTER SITEMAP
    if (type === 'index') {
      xmlContent = `${xmlHeader}
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
         <sitemap><loc>${BASE_URL}/movies.xml</loc></sitemap>
         <sitemap><loc>${BASE_URL}/series.xml</loc></sitemap>
      </sitemapindex>`;
    } 
    
    // 2. MOVIES SITEMAP
    else if (type === 'movies') {
      const snapshot = await db.collection('movies')
        .where('isPublic', '==', true)
        .where('index', '==', true)
        .where('inSitemap', '==', true)
        .select('slug', 'lastUpdated') // Save memory
        .get();

      const urls = snapshot.docs.map(doc => {
        const d = doc.data();
        if(!d.slug) return '';
        return `<url><loc>${BASE_URL}/${esc(d.slug)}</loc><changefreq>weekly</changefreq></url>`;
      }).join('');

      xmlContent = `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
    } 
    
    // 3. SERIES SITEMAP
    else if (type === 'series') {
      const snapshot = await db.collection('series')
        .where('isPublic', '==', true)
        .where('index', '==', true)
        .where('inSitemap', '==', true)
        .select('slug', 'episodes') // Save memory
        .get();

      let urls = "";
      snapshot.forEach(doc => {
        const d = doc.data();
        if(!d.slug) return;
        
        // Series Page
        urls += `<url><loc>${BASE_URL}/${esc(d.slug)}</loc><priority>0.9</priority></url>`;
        
        // Episode Pages
        if (d.episodes && Array.isArray(d.episodes)) {
            d.episodes.forEach(ep => {
                if(ep.episodeNumber) {
                   urls += `<url><loc>${BASE_URL}/${esc(d.slug)}/episode-${ep.episodeNumber}</loc><priority>0.7</priority></url>`;
                }
            });
        }
      });

      xmlContent = `${xmlHeader}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
    }

    return {
      statusCode: 200,
      headers: { 
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600" // 1 Hour Cache
      },
      body: xmlContent
    };

  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: "Error generating sitemap" };
  }
};
