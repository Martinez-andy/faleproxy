const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Create Express app
const app = express();
const router = express.Router();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Home route
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
    const response = await fetch(url);
    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');
    
    // Use cheerio to parse HTML and selectively replace text content, not URLs
    const $ = cheerio.load(html);
    
    let replacementCount = 0;
    
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.type === 'text';
    }).each(function() {
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
    
    // Replace Yale with Fale in the title
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

// Start server if not being imported
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Faleproxy server running at http://localhost:${PORT}`);
  });
}

// Export the app for testing
module.exports = app;

// Also export the router and replaceYaleWithFale function for testing
app.router = router;
app.replaceYaleWithFale = replaceYaleWithFale;