// =================================================================
// CHT Mobile Intelligence Platform - Database Access Layer (DAO)
// Uses better-sqlite3 for synchronous, high-throughput SQLite queries
// =================================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'phones.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed_data.json');

// Initialize database with WAL mode for fast concurrent read/writes
const db = new Database(DB_PATH, {
    // verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Run PRAGMA configurations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

/**
 * Initializes the SQLite database schema and seeds initial data if table is empty.
 */
function initDatabase() {
    try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.exec(schema);

        // Check if phones table has data; if not, seed initial baseline dataset
        const countRow = db.prepare('SELECT COUNT(*) AS count FROM phones').get();
        if (countRow.count === 0) {
            console.log('📦 Database is empty. Seeding initial Samsung & Apple mobile phone data...');
            seedDatabase();
        } else {
            console.log(`✅ Database ready. Currently tracking ${countRow.count} mobile devices.`);
        }
    } catch (err) {
        console.error('❌ Error initializing database:', err.message);
        throw err;
    }
}

/**
 * Seeds baseline realistic Samsung and Apple data from seed_data.json
 */
function seedDatabase() {
    if (!fs.existsSync(SEED_PATH)) {
        console.warn('⚠️ No seed_data.json found at', SEED_PATH);
        return;
    }

    const seedRaw = fs.readFileSync(SEED_PATH, 'utf8');
    const phones = JSON.parse(seedRaw);

    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO phones (
            asin, brand, model_name, full_title, variant, color,
            storage_gb, ram_gb, processor, battery_mah, display_spec,
            camera_spec, os, price, original_price, discount_percent,
            currency, rating, review_count, availability, image_url,
            amazon_url, is_featured, updated_at
        ) VALUES (
            @asin, @brand, @model_name, @full_title, @variant, @color,
            @storage_gb, @ram_gb, @processor, @battery_mah, @display_spec,
            @camera_spec, @os, @price, @original_price, @discount_percent,
            @currency, @rating, @review_count, @availability, @image_url,
            @amazon_url, @is_featured, CURRENT_TIMESTAMP
        )
    `);

    const insertMany = db.transaction((items) => {
        let inserted = 0;
        for (const phone of items) {
            insertStmt.run(phone);
            inserted++;
        }
        return inserted;
    });

    const count = insertMany(phones);
    console.log(`🎉 Successfully seeded ${count} devices into SQLite database!`);

    // Log the initial seed
    logScrape({
        source: 'System Seed',
        target_brand: 'All',
        items_scraped: count,
        items_inserted: count,
        items_updated: 0,
        status: 'SUCCESS',
        duration_ms: 120,
        error_message: null
    });
}

/**
 * Retrieves phones with multi-faceted filtering, full-text search, and pagination.
 */
function getPhones(options = {}) {
    const {
        brand,
        search,
        minPrice,
        maxPrice,
        ram,
        storage,
        minRating,
        sort = 'rating',
        order = 'desc',
        page = 1,
        limit = 12
    } = options;

    const whereClauses = [];
    const params = {};

    // Brand filter (Apple, Samsung)
    if (brand && brand !== 'All') {
        whereClauses.push('brand = @brand COLLATE NOCASE');
        params.brand = brand;
    }

    // Price range filters
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        whereClauses.push('price >= @minPrice');
        params.minPrice = Number(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        whereClauses.push('price <= @maxPrice');
        params.maxPrice = Number(maxPrice);
    }

    // RAM filter
    if (ram && ram !== 'All') {
        whereClauses.push('ram_gb = @ram');
        params.ram = Number(ram);
    }

    // Storage filter
    if (storage && storage !== 'All') {
        whereClauses.push('storage_gb = @storage');
        params.storage = Number(storage);
    }

    // Minimum rating filter
    if (minRating) {
        whereClauses.push('rating >= @minRating');
        params.minRating = Number(minRating);
    }

    // Search filter (Exact or Fuzzy/Keyword)
    if (search && search.trim().length > 0) {
        const cleanSearch = search.trim();
        // Support searching by model_name, full_title, processor, variant, color, or brand
        whereClauses.push(`(
            model_name LIKE @searchKeyword
            OR full_title LIKE @searchKeyword
            OR processor LIKE @searchKeyword
            OR variant LIKE @searchKeyword
            OR color LIKE @searchKeyword
            OR brand LIKE @searchKeyword
        )`);
        params.searchKeyword = `%${cleanSearch}%`;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Allowed sort columns to prevent SQL injection
    const allowedSorts = {
        price: 'price',
        rating: 'rating',
        reviews: 'review_count',
        model: 'model_name',
        newest: 'id'
    };

    const sortColumn = allowedSorts[sort] || 'rating';
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count total records matching criteria
    const countQuery = `SELECT COUNT(*) AS total FROM phones ${whereSql}`;
    const totalCount = db.prepare(countQuery).get(params).total;

    // Fetch paginated records
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    params.limit = Number(limit);
    params.offset = offset;

    const dataQuery = `
        SELECT * FROM phones
        ${whereSql}
        ORDER BY is_featured DESC, ${sortColumn} ${sortOrder}
        LIMIT @limit OFFSET @offset
    `;

    const phones = db.prepare(dataQuery).all(params);

    return {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalCount / limit) || 1,
        phones
    };
}

/**
 * Quick search for live search dropdown / autocomplete
 */
function quickSearch(query, limit = 8) {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const term = `%${query.trim()}%`;
    const stmt = db.prepare(`
        SELECT id, asin, brand, model_name, variant, price, original_price, discount_percent, rating, image_url, amazon_url
        FROM phones
        WHERE model_name LIKE ?
           OR full_title LIKE ?
           OR processor LIKE ?
           OR variant LIKE ?
           OR brand LIKE ?
        ORDER BY
            CASE
                WHEN model_name LIKE ? THEN 1
                WHEN full_title LIKE ? THEN 2
                ELSE 3
            END,
            rating DESC
        LIMIT ?
    `);

    return stmt.all(term, term, term, term, term, `${query.trim()}%`, `${query.trim()}%`, limit);
}

/**
 * Get single phone by ID
 */
function getPhoneById(id) {
    const stmt = db.prepare('SELECT * FROM phones WHERE id = ?');
    return stmt.get(id);
}

/**
 * Get phones for comparison by array of IDs
 */
function getPhonesByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM phones WHERE id IN (${placeholders})`);
    return stmt.all(...ids);
}

/**
 * Upsert phone record (used by scraper & importer)
 */
function upsertPhone(phone) {
    const stmt = db.prepare(`
        INSERT INTO phones (
            asin, brand, model_name, full_title, variant, color,
            storage_gb, ram_gb, processor, battery_mah, display_spec,
            camera_spec, os, price, original_price, discount_percent,
            currency, rating, review_count, availability, image_url,
            amazon_url, is_featured, updated_at
        ) VALUES (
            @asin, @brand, @model_name, @full_title, @variant, @color,
            @storage_gb, @ram_gb, @processor, @battery_mah, @display_spec,
            @camera_spec, @os, @price, @original_price, @discount_percent,
            @currency, @rating, @review_count, @availability, @image_url,
            @amazon_url, @is_featured, CURRENT_TIMESTAMP
        )
        ON CONFLICT(asin) DO UPDATE SET
            price = excluded.price,
            original_price = excluded.original_price,
            discount_percent = excluded.discount_percent,
            rating = excluded.rating,
            review_count = excluded.review_count,
            availability = excluded.availability,
            updated_at = CURRENT_TIMESTAMP
    `);

    return stmt.run(phone);
}

/**
 * Bulk upsert phones within a transaction
 */
function bulkUpsertPhones(phonesList) {
    let inserted = 0;
    let updated = 0;

    const checkStmt = db.prepare('SELECT id FROM phones WHERE asin = ?');
    const upsertTx = db.transaction((list) => {
        for (const phone of list) {
            const exists = checkStmt.get(phone.asin);
            upsertPhone(phone);
            if (exists) {
                updated++;
            } else {
                inserted++;
            }
        }
    });

    upsertTx(phonesList);
    return { inserted, updated };
}

/**
 * Compute aggregate statistics for the dashboard
 */
function getStats() {
    const totalDevices = db.prepare('SELECT COUNT(*) AS total FROM phones').get().total;
    const appleCount = db.prepare("SELECT COUNT(*) AS count FROM phones WHERE brand = 'Apple' COLLATE NOCASE").get().count;
    const samsungCount = db.prepare("SELECT COUNT(*) AS count FROM phones WHERE brand = 'Samsung' COLLATE NOCASE").get().count;

    const avgPrice = db.prepare('SELECT ROUND(AVG(price), 2) AS avg FROM phones').get().avg || 0;
    const avgApplePrice = db.prepare("SELECT ROUND(AVG(price), 2) AS avg FROM phones WHERE brand = 'Apple' COLLATE NOCASE").get().avg || 0;
    const avgSamsungPrice = db.prepare("SELECT ROUND(AVG(price), 2) AS avg FROM phones WHERE brand = 'Samsung' COLLATE NOCASE").get().avg || 0;

    const minPrice = db.prepare('SELECT MIN(price) AS min FROM phones').get().min || 0;
    const maxPrice = db.prepare('SELECT MAX(price) AS max FROM phones').get().max || 0;

    // Price distribution buckets
    const priceBuckets = {
        under30k: db.prepare('SELECT COUNT(*) AS count FROM phones WHERE price < 30000').get().count,
        from30kTo70k: db.prepare('SELECT COUNT(*) AS count FROM phones WHERE price >= 30000 AND price < 70000').get().count,
        from70kTo100k: db.prepare('SELECT COUNT(*) AS count FROM phones WHERE price >= 70000 AND price < 100000').get().count,
        above100k: db.prepare('SELECT COUNT(*) AS count FROM phones WHERE price >= 100000').get().count
    };

    // Storage distribution
    const storageDist = db.prepare(`
        SELECT storage_gb, COUNT(*) AS count
        FROM phones
        WHERE storage_gb IS NOT NULL
        GROUP BY storage_gb
        ORDER BY storage_gb ASC
    `).all();

    // RAM distribution
    const ramDist = db.prepare(`
        SELECT ram_gb, COUNT(*) AS count
        FROM phones
        WHERE ram_gb IS NOT NULL
        GROUP BY ram_gb
        ORDER BY ram_gb ASC
    `).all();

    // Top 5 Highest Rated
    const topRated = db.prepare(`
        SELECT id, brand, model_name, price, rating, review_count, image_url
        FROM phones
        ORDER BY rating DESC, review_count DESC
        LIMIT 5
    `).all();

    // Latest scrape log
    const lastScrape = db.prepare(`
        SELECT * FROM scrape_logs
        ORDER BY created_at DESC
        LIMIT 1
    `).get();

    return {
        totalDevices,
        appleCount,
        samsungCount,
        avgPrice,
        avgApplePrice,
        avgSamsungPrice,
        minPrice,
        maxPrice,
        priceBuckets,
        storageDist,
        ramDist,
        topRated,
        lastScrape
    };
}

/**
 * Record a scrape session log
 */
function logScrape(log) {
    const stmt = db.prepare(`
        INSERT INTO scrape_logs (
            source, target_brand, items_scraped, items_inserted,
            items_updated, status, duration_ms, error_message
        ) VALUES (
            @source, @target_brand, @items_scraped, @items_inserted,
            @items_updated, @status, @duration_ms, @error_message
        )
    `);
    return stmt.run({
        source: log.source || 'Amazon India',
        target_brand: log.target_brand || 'All',
        items_scraped: log.items_scraped || 0,
        items_inserted: log.items_inserted || 0,
        items_updated: log.items_updated || 0,
        status: log.status || 'SUCCESS',
        duration_ms: log.duration_ms || 0,
        error_message: log.error_message || null
    });
}

/**
 * Retrieve recent scrape logs
 */
function getScrapeLogs(limit = 10) {
    const stmt = db.prepare('SELECT * FROM scrape_logs ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit);
}

// Initialize on module load
initDatabase();

module.exports = {
    db,
    initDatabase,
    getPhones,
    quickSearch,
    getPhoneById,
    getPhonesByIds,
    upsertPhone,
    bulkUpsertPhones,
    getStats,
    logScrape,
    getScrapeLogs
};

