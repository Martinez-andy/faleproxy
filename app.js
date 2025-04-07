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
    
    // Function to replace text but skip URLs and attributes
    function replaceYaleWithFale(i, el) {
      if ($(el).children().length === 0 || $(el).text().trim() !== '') {
        // Get the HTML content of the element
        let content = $(el).html();
        
        // Only process if it's a text node
        if (content && $(el).children().length === 0) {
          // Replace Yale with Fale in text content only
          content = content.replace(/Yale/g, 'Fale').replace(/yale/g, 'fale');
          $(el).html(content);
        }
      }
    }
    
    // Process text nodes in the body
    $('body *').contents().filter(function() {
      return this.nodeType === 3; // Text nodes only
    }).each(function() {
      // Replace text content but not in URLs or attributes
      const text = $(this).text();
      // Only perform replacement if 'Yale' or 'yale' is actually present
      if (text.match(/Yale|yale/i)) {
        // Use case-preserving replacement
        const newText = text.replace(/YALE/g, 'FALE')
                           .replace(/Yale/g, 'Fale')
                           .replace(/yale/g, 'fale');
        if (text !== newText) {
          $(this).replaceWith(newText);
        }
      }
    });
    
    // Process title separately
    const title = $('title').text();
    // Only replace if Yale is present
    if (title.match(/Yale|yale/i)) {
      const newTitle = title.replace(/YALE/g, 'FALE')
                           .replace(/Yale/g, 'Fale')
                           .replace(/yale/g, 'fale');
      $('title').text(newTitle);
    }
    
    return res.json({ 
      success: true, 
      content: $.html(),
      title: $('title').text(),
      originalUrl: url
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

// Export the router for testing
module.exports = router;