/**
 * @jest-environment jsdom
 */

// Set up the DOM environment
document.body.innerHTML = `
  <form id="url-form">
    <input id="url-input" type="text" />
    <button type="submit">Submit</button>
  </form>
  <div id="loading" class="hidden">Loading...</div>
  <div id="error-message" class="hidden"></div>
  <div id="result-container" class="hidden">
    <div id="info-bar">
      <span>Original URL: <a id="original-url" href="#"></a></span>
      <span>Page Title: <span id="page-title"></span></span>
      <span>Replacements: <span id="count-value">0</span></span>
    </div>
    <div id="content-display"></div>
  </div>
`;

// Add the 'hidden' class
const style = document.createElement('style');
style.innerHTML = '.hidden { display: none; }';
document.head.appendChild(style);

// Mock fetch
global.fetch = jest.fn();

// Create a simplified version of the script.js functionality for testing
function setupFaleproxyApp() {
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const loadingElement = document.getElementById('loading');
  const errorMessage = document.getElementById('error-message');
  const resultContainer = document.getElementById('result-container');
  const contentDisplay = document.getElementById('content-display');
  const originalUrlElement = document.getElementById('original-url');
  const pageTitleElement = document.getElementById('page-title');
  const countElement = document.getElementById('count-value');

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  async function handleFormSubmit(e) {
    if (e) e.preventDefault();
    
    const url = urlInput.value.trim();
    
    if (!url) {
      showError('Please enter a valid URL');
      return;
    }
    
    // Show loading indicator
    loadingElement.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
      const response = await fetch('/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch content');
      }
      
      // Update the info bar
      originalUrlElement.textContent = url;
      originalUrlElement.href = url;
      pageTitleElement.textContent = data.title || 'No title';
      countElement.textContent = data.replacementCount || 0;
      
      // Display content
      contentDisplay.innerHTML = data.content;
      
      // Show result container
      resultContainer.classList.remove('hidden');
    } catch (error) {
      showError(error.message);
    } finally {
      // Hide loading indicator
      loadingElement.classList.add('hidden');
    }
  }

  // Set up event listeners
  urlForm.addEventListener('submit', handleFormSubmit);
  
  return {
    handleFormSubmit,
    showError
  };
}

// Tests
describe('Frontend Script', () => {
  let app;
  
  beforeEach(() => {
    // Reset mocks and DOM elements
    jest.clearAllMocks();
    document.getElementById('url-input').value = '';
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error-message').classList.add('hidden');
    document.getElementById('result-container').classList.add('hidden');
    document.getElementById('error-message').textContent = '';
    document.getElementById('content-display').innerHTML = '';
    document.getElementById('count-value').textContent = '0';
    
    // Initialize the app for each test
    app = setupFaleproxyApp();
  });

  test('should show error when URL is empty', () => {
    // Call the form submit handler directly
    app.handleFormSubmit({ preventDefault: jest.fn() });
    
    // Check if error message is displayed
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Please enter a valid URL');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
  });

  test('should show loading indicator and make fetch request when URL is provided', async () => {
    // Mock successful fetch response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        content: '<h1>Modified Content</h1>',
        title: 'Test Title',
        originalUrl: 'https://example.com'
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    // Set URL input value
    const urlInput = document.getElementById('url-input');
    urlInput.value = 'https://example.com';

    // Call the form submit handler directly
    await app.handleFormSubmit({ preventDefault: jest.fn() });

    // Check if fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: 'https://example.com' })
    });

    // Check if result container is shown
    const resultContainer = document.getElementById('result-container');
    expect(resultContainer.classList.contains('hidden')).toBe(false);

    // Check if content is displayed
    const contentDisplay = document.getElementById('content-display');
    expect(contentDisplay.innerHTML).toBe('<h1>Modified Content</h1>');

    // Check if original URL and title are displayed
    const originalUrlElement = document.getElementById('original-url');
    const pageTitleElement = document.getElementById('page-title');
    expect(originalUrlElement.textContent).toBe('https://example.com');
    expect(pageTitleElement.textContent).toBe('Test Title');
  });

  test('should handle fetch errors', async () => {
    // Mock failed fetch response
    global.fetch.mockRejectedValue(new Error('Network error'));

    // Set URL input value
    const urlInput = document.getElementById('url-input');
    urlInput.value = 'https://example.com';

    // Call the form submit handler directly
    await app.handleFormSubmit({ preventDefault: jest.fn() });

    // Check if error message is displayed
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Network error');
    expect(errorMessage.classList.contains('hidden')).toBe(false);

    // Check if loading indicator is hidden
    const loadingElement = document.getElementById('loading');
    expect(loadingElement.classList.contains('hidden')).toBe(true);
  });

  test('should handle non-OK responses', async () => {
    // Mock non-OK fetch response
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Invalid URL'
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    // Set URL input value
    const urlInput = document.getElementById('url-input');
    urlInput.value = 'https://example.com';

    // Call the form submit handler directly
    await app.handleFormSubmit({ preventDefault: jest.fn() });

    // Check if error message is displayed
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Invalid URL');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
  });

  test('should directly call showError function', () => {
    // Test the showError function directly
    app.showError('Test error message');
    
    // Check if error message is displayed
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Test error message');
    expect(errorMessage.classList.contains('hidden')).toBe(false);
  });

  test('should display replacement count when provided in the response', async () => {
    // Mock successful fetch response with replacement count
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        content: '<h1>Modified Content</h1>',
        title: 'Test Title',
        originalUrl: 'https://example.com',
        replacementCount: 42
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    // Set URL input value
    const urlInput = document.getElementById('url-input');
    urlInput.value = 'https://example.com';

    // Call the form submit handler directly
    await app.handleFormSubmit({ preventDefault: jest.fn() });

    // Check if the replacement count is displayed correctly
    const countElement = document.getElementById('count-value');
    expect(countElement.textContent).toBe('42');
  });

  test('should display 0 replacements when count is not provided in the response', async () => {
    // Mock successful fetch response without replacement count
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        content: '<h1>Modified Content</h1>',
        title: 'Test Title',
        originalUrl: 'https://example.com'
        // No replacementCount field
      })
    };
    global.fetch.mockResolvedValue(mockResponse);

    // Set URL input value
    const urlInput = document.getElementById('url-input');
    urlInput.value = 'https://example.com';

    // Call the form submit handler directly
    await app.handleFormSubmit({ preventDefault: jest.fn() });

    // Check if the replacement count defaults to 0
    const countElement = document.getElementById('count-value');
    expect(countElement.textContent).toBe('0');
  });
});
