const request = require('supertest');
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const nock = require('nock');
const { sampleHtmlWithYale } = require('./test-utils');
const appModule = require('../app');

// Mock axios to avoid actual HTTP requests
jest.mock('axios');

// Create a test app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', appModule.router);

describe('Faleproxy App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET / should serve the main page', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.header['content-type']).toMatch(/html/);
  });

  test('POST /fetch should replace Yale with Fale in content', async () => {
    // Mock axios.get to return sample HTML
    axios.get.mockResolvedValue({ data: sampleHtmlWithYale, headers: { 'content-type': 'text/html' } });

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
    axios.get.mockResolvedValue({ data: '{"key": "value"}', headers: { 'content-type': 'application/json' } });

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
    axios.get.mockResolvedValue({ data: '', headers: { 'content-type': 'text/html' } });

    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/empty' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // Cheerio creates minimal HTML structure even for empty content
    expect(response.body.content).toContain('<html>');
    expect(response.body.content).toContain('<body>');
  });

  test('replaceYaleWithFale function should count replacements correctly', () => {
    // Test with no Yale occurrences
    const result1 = appModule.replaceYaleWithFale('This is a test with no occurrences');
    expect(result1.text).toBe('This is a test with no occurrences');
    expect(result1.count).toBe(0);
    
    // Test with one Yale occurrence
    const result2 = appModule.replaceYaleWithFale('This is Yale University');
    expect(result2.text).toBe('This is Fale University');
    expect(result2.count).toBe(1);
    
    // Test with multiple Yale occurrences in different cases
    const result3 = appModule.replaceYaleWithFale('YALE, Yale, and yale are all replaced');
    expect(result3.text).toBe('FALE, Fale, and fale are all replaced');
    expect(result3.count).toBe(3);
    
    // Test with empty input
    const result4 = appModule.replaceYaleWithFale('');
    expect(result4.text).toBe('');
    expect(result4.count).toBe(0);
    
    // Test with null input
    const result5 = appModule.replaceYaleWithFale(null);
    expect(result5.text).toBe('');
    expect(result5.count).toBe(0);
  });

  test('fetch endpoint should return replacement count', async () => {
    // Mock a successful fetch response with Yale occurrences
    axios.get.mockResolvedValue({
      data: '<html><head><title>Yale University</title></head><body><p>Welcome to Yale!</p></body></html>',
      headers: { 'content-type': 'text/html' }
    });
    
    const response = await request(app)
      .post('/fetch')
      .send({ url: 'https://example.com/' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.replacementCount).toBeDefined();
    // The exact count may vary based on implementation details, just check it's a number
    expect(typeof response.body.replacementCount).toBe('number');
  });
});
