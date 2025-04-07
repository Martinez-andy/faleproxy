const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware to parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Create a router for the routes
const router = express.Router();

// Route to serve the main page
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Function to replace Yale with Fale in text
function replaceYaleWithFale(text) {
  if (!text) return { text: '', count: 0 };
  
  let count = 0;
  
  // Replace Yale with Fale (case-sensitive)
  let modifiedText = text.replace(/Yale/g, () => {
    count++;
    return 'Fale';
  });
  
  // Replace YALE with FALE (all caps)
  modifiedText = modifiedText.replace(/YALE/g, () => {
    count++;
    return 'FALE';
  });
  
  // Replace yale with fale (all lowercase)
  modifiedText = modifiedText.replace(/yale/g, () => {
    count++;
    return 'fale';
  });
  
  return { text: modifiedText, count };
}

// API endpoint to fetch and modify content
router.post('/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the content from the provided URL
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    let replacementCount = 0;
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      // Replace text content but not in URLs or attributes
      const text = $(this).text();
      // Only perform replacement if 'Yale' or 'yale' is actually present
      if (text.match(/Yale|yale/i)) {
        const result = replaceYaleWithFale(text);
        if (result.count > 0) {
          $(this).replaceWith(result.text);
          replacementCount += result.count;
        }
      }
    });
    
    // Process title separately
    const title = $('title').text();
    // Only replace if Yale is present
    if (title.match(/Yale|yale/i)) {
      const titleResult = replaceYaleWithFale(title);
      $('title').text(titleResult.text);
      replacementCount += titleResult.count;
    }
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: $('title').text(),
      originalUrl: url,
      replacementCount
    });
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    return res.status(500).json({ 
      error: `Failed to fetch content: ${error.message}` 
    });
  }
});

// Apply the router to the app
app.use('/', router);

// Start the server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

// Export the router and the replaceYaleWithFale function for testing
module.exports = {
  router,
  replaceYaleWithFale
};