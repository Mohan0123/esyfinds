// netlify/functions/seo-handler.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// सुनिश्चित करें कि आपने Netlify UI में एनवायरनमेंट वेरिएबल्स सेट किए हैं:
// FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
    // आपकी databaseURL यहाँ अपडेट कर दी गई है
    databaseURL: "https://easyfind-am0cd-default-rtdb.firebaseio.com"
  });
}

exports.handler = async (event) => {
  const slug = event.queryStringParameters.slug;
  if (!slug) return { statusCode: 400, body: 'Slug is missing' };

  try {
    const db = admin.database();
    const snapshot = await db.ref(`shops/${slug}`).once('value');
    const currentShop = snapshot.val();

    if (!currentShop) {
      return { statusCode: 404, body: 'Shop not found' };
    }

    const templatePath = path.resolve(__dirname, '../../shop.html');
    const template = fs.readFileSync(templatePath, 'utf-8');
    
    // SEO मेटा टैग्स को बदलें
    const seoTemplate = template
      .replace(/<title>Shop<\/title>/g, `<title>${currentShop.name}</title>`)
      .replace(/<meta name="description" content="([^"]*)"/g, `<meta name="description" content="${currentShop.description}">`)
      .replace(/<meta property="og:title" content="([^"]*)"/g, `<meta property="og:title" content="${currentShop.name}">`)
      .replace(/<meta property="og:description" content="([^"]*)"/g, `<meta property="og:description" content="${currentShop.description}">`)
      .replace(/<meta property="og:image" content="([^"]*)"/g, `<meta property="og:image" content="${currentShop.image}">`)
      .replace(/<meta property="og:url" content="([^"]*)"/g, `<meta property="og:url" content="https://yourwebsite.com/shop/${slug}">`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: seoTemplate,
    };
  } catch (error) {
    console.error('Firebase error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};