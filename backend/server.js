// backend/server.js
// Run with: node server.js

const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const parser = new Parser();

// -----------------------------
// 1. Basic middleware
// -----------------------------
app.use(cors());
app.use(express.json());

// -----------------------------
// 2. SQLite database setup
// -----------------------------
const dbPath = path.join(__dirname, "deals.db");
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

// -----------------------------
// 3. RSS feeds config (EXAMPLES)
//   You will replace these with real feeds that work.
//   Some sites block scraping or require permission –
//   always check their terms.
// -----------------------------
const FEEDS = [
    {
        name: "Example Feed 1",
        url: "https://www.rightmove.co.uk/rss/property-for-sale/find.html?locationIdentifier=REGION%5E93917" // Manchester example
    },
    {
        name: "Example Feed 2",
        url: "https://www.zoopla.co.uk/for-sale/property/manchester/?rss=1"
    }
    // Add more feeds here as needed
];

// -----------------------------
// 4. Keyword sets for tagging
// -----------------------------
const KEYWORDS = {
    renovation: ["renovation", "modernisation", "refurb", "needs work", "project"],
    auction: ["auction", "bid", "bidding", "under the hammer"],
    motivatedSeller: ["motivated", "quick sale", "must sell"],
    belowMarketValue: ["bmv", "below market value", "discount", "reduced"],
    chainFree: ["chain free", "no chain"],
    investorOnly: ["investor", "cash buyers", "investment opportunity", "tenanted"]
};

// -----------------------------
// 5. Helper: detect tags using keywords
// -----------------------------
function detectTags(title, description) {
    const text = (title + " " + (description || "")).toLowerCase();
    const tags = [];

    for (const key in KEYWORDS) {
        const words = KEYWORDS[key];
        if (words.some(word => text.includes(word))) {
            tags.push(key);
        }
    }

    return tags;
}

// -----------------------------
// 6. Helper: crude price extraction from text
// -----------------------------
function extractPrice(text) {
    if (!text) return null;
    const cleaned = text.replace(/,/g, "");
    const match = cleaned.match(/£?(\d{5,9})/);
    return match ? parseInt(match[1], 10) : null;
}

// -----------------------------
// 7. Deal scoring (0–100)
//   Very simple first version:
//   - Has price  → +10
//   - Has tags   → + for "good" tags
//   - Higher price doesn't mean better – this is
//     just a placeholder to get you started.
// -----------------------------
function scoreDeal(deal) {
    let score = 0;

    if (deal.price) score += 10;

    const tags = deal.tags || [];

    if (tags.includes("renovation")) score += 20;
    if (tags.includes("auction")) score += 10;
    if (tags.includes("belowMarketValue")) score += 30;
    if (tags.includes("motivatedSeller")) score += 15;
    if (tags.includes("chainFree")) score += 10;
    if (tags.includes("investorOnly")) score += 15;

    if (score > 100) score = 100;
    return score;
}

// -----------------------------
// 8. Fetch + normalise single RSS feed
// -----------------------------
async function fetchFeed(feed) {
    try {
        const parsed = await parser.parseURL(feed.url);

        return parsed.items.map(item => {
            const title = item.title || "";
            const description = item.contentSnippet || item.content || "";
            const tags = detectTags(title, description);
            const price = extractPrice(title + " " + description);

            return {
                source: feed.name,
                title,
                link: item.link || "",
                description,
                pubDate: item.pubDate || "",
                price,
                tags,
                score: 0 // placeholder, we will fill below
            };
        });
    } catch (err) {
        console.error(`Error fetching feed ${feed.name}:`, err.message);
        return [];
    }
}

// -----------------------------
// 9. Fetch all feeds + store in DB
// -----------------------------
async function refreshDeals() {
    console.log("Refreshing deals from feeds...");

    let allDeals = [];

    for (const feed of FEEDS) {
        const deals = await fetchFeed(feed);
        allDeals.push(...deals);
    }

    console.log(`Fetched ${allDeals.length} deals from all feeds.`);

    const stmt = db.prepare(`
    INSERT OR IGNORE INTO deals (source, title, link, description, pubDate, price, tags, score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    db.serialize(() => {
        allDeals.forEach(deal => {
            const tagsStr = (deal.tags || []).join(",");
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
    console.log("Deals stored/updated in SQLite.");
}

// -----------------------------
// 10. API: Get deals (for your frontend)
// -----------------------------
app.get("/api/deals", (req, res) => {
    // later you can add filters: ?minScore=50&tag=renovation etc
    db.all(
        "SELECT id, source, title, link, description, pubDate, price, tags, score FROM deals ORDER BY created_at DESC LIMIT 200",
        [],
        (err, rows) => {
            if (err) {
                console.error("Error reading deals:", err);
                return res.status(500).json({ error: "Database error" });
            }

            const deals = rows.map(row => ({
                id: row.id,
                source: row.source,
                title: row.title,
                link: row.link,
                description: row.description,
                pubDate: row.pubDate,
                price: row.price,
                tags: row.tags ? row.tags.split(",") : [],
                score: row.score
            }));

            res.json({ count: deals.length, deals });
        }
    );
});

// -----------------------------
// 11. API: manual refresh (for now)
//   Call http://localhost:4000/api/refresh once in browser
//   to pull latest RSS and store in DB.
// -----------------------------
app.get("/api/refresh", async (req, res) => {
    await refreshDeals();
    res.json({ status: "ok" });
});

// -----------------------------
// 12. TODO: Alerts & Gumtree scraper hooks
//   Here you will later:
//   - Add cron jobs to refresh every X minutes
//   - Add functions to send email/Telegram alerts
//   - Add Gumtree/other integrations (respecting terms)
// -----------------------------

// Example placeholder for where alerts would be triggered:
function maybeSendAlert(deal) {
    // e.g. if (deal.score >= 80) { send email / Telegram }
    // For now, we just log:
    if (deal.score >= 80) {
        console.log("🔥 High scoring deal (placeholder alert):", deal.title);
    }
}

// -----------------------------
// 13. Start server
// -----------------------------
const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    // Optionally perform an initial refresh on startup:
    refreshDeals().catch(err => console.error("Initial refresh error:", err));
});
