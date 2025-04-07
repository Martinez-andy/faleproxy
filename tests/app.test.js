const request = require('supertest');
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { sampleHtmlWithYale } = require('./test-utils');

// Mock axios to avoid actual HTTP requests
jest.mock('axios');

// Create a test app instance
const app = express();
// Require the app.js file to test its routes
const appRoutes = require('../app');

// Apply the routes to our test app
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', appRoutes);

describe('Faleproxy App', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('GET / should serve the main page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.header['content-type']).toMatch(/html/);
  });

  test('POST /fetch should replace Yale with Fale in content', async () => {
    // Mock axios.get to return sample HTML
    axios.get.mockResolvedValue({ data: sampleHtmlWithYale });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.originalUrl).toBe('https://example.com');
    
    // Check that Yale has been replaced with Fale
    const $ = cheerio.load(response.body.content);
    expect($('title').text()).toBe('Fale University Test Page');
    expect($('h1').text()).toBe('Welcome to Fale University');
    expect($('p').first().text()).toContain('Fale University is a private');
    
    // Check that URLs remain unchanged
    const links = $('a');
    let hasYaleUrl = false;
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href && href.includes('yale.edu')) {
        hasYaleUrl = true;
      }
    });
    expect(hasYaleUrl).toBe(true);
  });

  test('POST /fetch should handle missing URL parameter', async () => {
    const response = await request(app)
      .post('/fetch')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('URL is required');
  });

  test('POST /fetch should handle fetch errors', async () => {
    // Mock axios.get to throw an error
    axios.get.mockRejectedValue(new Error('Network error'));

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com' });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Failed to fetch content');
  });

  test('POST /fetch should handle non-HTML responses', async () => {
    // Mock axios.get to return non-HTML content
    axios.get.mockResolvedValue({ data: '{"key": "value"}' });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/api' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Cheerio wraps content in HTML tags, so check if our content is contained
    expect(response.body.content).toContain('{"key": "value"}');
  });

  test('POST /fetch should handle empty responses', async () => {
    // Mock axios.get to return empty content
    axios.get.mockResolvedValue({ data: '' });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/empty' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Cheerio creates minimal HTML structure even for empty content
    expect(response.body.content).toContain('<html>');
    expect(response.body.content).toContain('<body>');
  });
});
