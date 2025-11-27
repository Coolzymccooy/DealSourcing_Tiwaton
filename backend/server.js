// backend/app.js
const express = require('express');
const cors = require('cors');
const Parser = require('rss-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const parser = new Parser();

// Basic middleware
app.use(cors());
app.use(express.json());

// SQLite database setup.
// In production you'll want to use a managed database service,
// because Vercel cannot persist a local SQLite file.
const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'deals.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      title TEXT,
      link TEXT UNIQUE,
      description TEXT,
      pubDate TEXT,
      price INTEGER,
      tags TEXT,
      score INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
});

// Example feeds and keywords… (unchanged from your original)
const FEEDS = [
    {
        name: 'Example Feed 1',
        url: 'https://www.rightmove.co.uk/rss/property-for-sale/find.html?locationIdentifier=REGION%5E93917'
    },
    {
        name: 'Example Feed 2',
        url: 'https://www.zoopla.co.uk/for-sale/property/manchester/?rss=1'
    }
];

const KEYWORDS = {
    renovation: ['renovation', 'modernisation', 'refurb', 'needs work', 'project'],
    auction: ['auction', 'bid', 'bidding', 'under the hammer'],
    motivatedSeller: ['motivated', 'quick sale', 'must sell'],
    belowMarketValue: ['bmv', 'below market value', 'discount', 'reduced'],
    chainFree: ['chain free', 'no chain'],
    investorOnly: ['investor', 'cash buyers', 'investment opportunity', 'tenanted']
};

// Helper functions (unchanged)
function detectTags(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    const tags = [];
    for (const key in KEYWORDS) {
        const words = KEYWORDS[key];
        if (words.some(word => text.includes(word))) {
            tags.push(key);
        }
    }
    return tags;
}

function extractPrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/,/g, '');
    const match = cleaned.match(/£?(\d{5,9})/);
    return match ? parseInt(match[1], 10) : null;
}

function scoreDeal(deal) {
    let score = 0;
    if (deal.price) score += 10;
    const tags = deal.tags || [];
    if (tags.includes('renovation')) score += 20;
    if (tags.includes('auction')) score += 10;
    if (tags.includes('belowMarketValue')) score += 30;
    if (tags.includes('motivatedSeller')) score += 15;
    if (tags.includes('chainFree')) score += 10;
    if (tags.includes('investorOnly')) score += 15;
    return Math.min(score, 100);
}

// Fetch and normalise a single feed
async function fetchFeed(feed) {
    try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.map(item => {
            const title = item.title || '';
            const description = item.contentSnippet || item.content || '';
            const tags = detectTags(title, description);
            const price = extractPrice(title + ' ' + description);
            return {
                source: feed.name,
                title,
                link: item.link || '',
                description,
                pubDate: item.pubDate || '',
                price,
                tags,
                score: 0 // placeholder
            };
        });
    } catch (err) {
        console.error(`Error fetching feed ${feed.name}:`, err.message);
        return [];
    }
}

// Refresh all feeds and store in SQLite
async function refreshDeals() {
    console.log('Refreshing deals from feeds…');
    let allDeals = [];
    for (const feed of FEEDS) {
        const deals = await fetchFeed(feed);
        allDeals.push(...deals);
    }
    console.log(`Fetched ${allDeals.length} deals.`);
    const stmt = db.prepare(`
    INSERT OR IGNORE INTO deals (source, title, link, description, pubDate, price, tags, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
    db.serialize(() => {
        allDeals.forEach(deal => {
            const tagsStr = (deal.tags || []).join(',');
            const score = scoreDeal(deal);
            stmt.run(
                deal.source,
                deal.title,
                deal.link,
                deal.description,
                deal.pubDate,
                deal.price,
                tagsStr,
                score
            );
        });
    });
    stmt.finalize();
    console.log('Deals stored/updated in SQLite.');
}

// API routes
app.get('/api/deals', (req, res) => {
    db.all(
        'SELECT id, source, title, link, description, pubDate, price, tags, score FROM deals ORDER BY created_at DESC LIMIT 200',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error reading deals:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            const deals = rows.map(row => ({
                id: row.id,
                source: row.source,
                title: row.title,
                link: row.link,
                description: row.description,
                pubDate: row.pubDate,
                price: row.price,
                tags: row.tags ? row.tags.split(',') : [],
                score: row.score
            }));
            res.json({ count: deals.length, deals });
        }
    );
});

app.get('/api/refresh', async (req, res) => {
    await refreshDeals();
    res.json({ status: 'ok' });
});

// Start the server only in local development.
// Vercel will import this file and use the exported `app`.
const port = process.env.PORT || 4000;
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Backend running at http://localhost:${port}`);
        // Perform an initial refresh on startup
        refreshDeals().catch(err => console.error('Initial refresh error:', err));
    });
} else {
    module.exports = app;
    // Optional: perform one refresh when the module is loaded.
    refreshDeals().catch(err => console.error('Initial refresh error:', err));
}
