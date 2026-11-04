-- =================================================================
-- CHT Mobile Intelligence Platform - SQLite Database Schema
-- Optimized for Fast Indexing, Full-Text Search, and Hardware Specs
-- =================================================================

-- Enable foreign keys and WAL mode for high concurrency
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- 1. Main Mobile Phones Table
CREATE TABLE IF NOT EXISTS phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asin TEXT UNIQUE NOT NULL,                  -- Amazon Standard Identification Number
    brand TEXT NOT NULL,                        -- 'Apple' or 'Samsung'
    model_name TEXT NOT NULL,                   -- e.g. 'iPhone 15 Pro Max', 'Galaxy S24 Ultra'
    full_title TEXT NOT NULL,                   -- Complete Amazon listing title
    variant TEXT,                               -- Color + Storage (e.g. 'Natural Titanium, 256GB')
    color TEXT,                                 -- e.g. 'Natural Titanium', 'Titanium Black'
    storage_gb INTEGER,                         -- Internal storage in GB (e.g. 128, 256, 512, 1024)
    ram_gb INTEGER,                             -- RAM in GB (e.g. 8, 12, 16)
    processor TEXT,                             -- e.g. 'A17 Pro', 'Snapdragon 8 Gen 3'
    battery_mah INTEGER,                        -- Battery capacity in mAh (e.g. 4422, 5000)
    display_spec TEXT,                          -- e.g. '6.7 inch Dynamic AMOLED 2X 120Hz'
    camera_spec TEXT,                           -- e.g. '200MP + 50MP + 12MP + 10MP Quad Camera'
    os TEXT,                                    -- 'iOS' or 'Android'
    price REAL NOT NULL,                        -- Current discounted price in INR (₹)
    original_price REAL,                        -- MRP / List price
    discount_percent INTEGER DEFAULT 0,         -- Discount percentage
    currency TEXT DEFAULT 'INR',                -- 'INR'
    rating REAL DEFAULT 0.0,                    -- Average rating (0.0 to 5.0)
    review_count INTEGER DEFAULT 0,             -- Total review count
    availability TEXT DEFAULT 'In Stock',       -- 'In Stock', 'Only 2 left', etc.
    image_url TEXT,                             -- High-res product thumbnail URL
    amazon_url TEXT NOT NULL,                   -- Direct Amazon canonical URL
    is_featured INTEGER DEFAULT 0,              -- 1 = Featured / Flagship, 0 = Normal
    scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for Instant Querying and Multi-Faceted Filtering
CREATE INDEX IF NOT EXISTS idx_phones_brand ON phones(brand);
CREATE INDEX IF NOT EXISTS idx_phones_price ON phones(price);
CREATE INDEX IF NOT EXISTS idx_phones_storage ON phones(storage_gb);
CREATE INDEX IF NOT EXISTS idx_phones_ram ON phones(ram_gb);
CREATE INDEX IF NOT EXISTS idx_phones_rating ON phones(rating);
CREATE INDEX IF NOT EXISTS idx_phones_model ON phones(model_name);

-- 3. Full-Text Search (FTS5) Virtual Table for Fast Search
-- Enables instant keyword matching for model names, brands, titles, processors, and variants
CREATE VIRTUAL TABLE IF NOT EXISTS phones_fts USING fts5(
    model_name,
    brand,
    full_title,
    variant,
    processor,
    content='phones',
    content_rowid='id'
);

-- 4. Triggers to Keep FTS5 Index Automatically Synchronized with phones Table
CREATE TRIGGER IF NOT EXISTS phones_ai AFTER INSERT ON phones BEGIN
    INSERT INTO phones_fts(rowid, model_name, brand, full_title, variant, processor)
    VALUES (new.id, new.model_name, new.brand, new.full_title, new.variant, new.processor);
END;

CREATE TRIGGER IF NOT EXISTS phones_ad AFTER DELETE ON phones BEGIN
    INSERT INTO phones_fts(phones_fts, rowid, model_name, brand, full_title, variant, processor)
    VALUES('delete', old.id, old.model_name, old.brand, old.full_title, old.variant, old.processor);
END;

CREATE TRIGGER IF NOT EXISTS phones_au AFTER UPDATE ON phones BEGIN
    INSERT INTO phones_fts(phones_fts, rowid, model_name, brand, full_title, variant, processor)
    VALUES('delete', old.id, old.model_name, old.brand, old.full_title, old.variant, old.processor);
    INSERT INTO phones_fts(rowid, model_name, brand, full_title, variant, processor)
    VALUES (new.id, new.model_name, new.brand, new.full_title, new.variant, new.processor);
END;

-- 5. Scrape Logs Table to Track Scraper Runs and Audit History
CREATE TABLE IF NOT EXISTS scrape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT DEFAULT 'Amazon India',
    target_brand TEXT NOT NULL,                 -- 'Apple', 'Samsung', or 'All'
    items_scraped INTEGER DEFAULT 0,
    items_inserted INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    status TEXT NOT NULL,                       -- 'SUCCESS', 'PARTIAL', 'FAILED'
    duration_ms INTEGER DEFAULT 0,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

