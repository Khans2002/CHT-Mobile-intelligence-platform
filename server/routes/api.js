// =================================================================
// CHT Mobile Intelligence Platform - REST API Router
// Provides high-performance endpoints for search, filtering, and stats
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../../database/db');

/**
 * @route   GET /api/phones
 * @desc    Get paginated mobile phones with multi-faceted filtering & search
 * @query   brand, search, minPrice, maxPrice, ram, storage, minRating, sort, order, page, limit
 */
router.get('/phones', (req, res) => {
    try {
        const result = db.getPhones(req.query);
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('Error fetching phones:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve mobile phone data',
            details: err.message
        });
    }
});

/**
 * @route   GET /api/search
 * @desc    Fast instant search & autocomplete suggestions
 * @query   q (search query), limit
 */
router.get('/search', (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit, 10) || 8;
        const results = db.quickSearch(query, limit);
        res.json({
            success: true,
            query,
            count: results.length,
            data: results
        });
    } catch (err) {
        console.error('Error executing quick search:', err);
        res.status(500).json({
            success: false,
            error: 'Quick search failed',
            details: err.message
        });
    }
});

/**
 * @route   GET /api/phones/:id
 * @desc    Get complete specifications for a single phone
 */
router.get('/phones/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, error: 'Invalid phone ID' });
        }

        const phone = db.getPhoneById(id);
        if (!phone) {
            return res.status(404).json({ success: false, error: 'Phone not found' });
        }

        res.json({
            success: true,
            data: phone
        });
    } catch (err) {
        console.error('Error fetching phone by ID:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve phone details',
            details: err.message
        });
    }
});

/**
 * @route   GET /api/compare
 * @desc    Get multiple phones for side-by-side hardware comparison
 * @query   ids (comma separated, e.g. ids=1,2,3)
 */
router.get('/compare', (req, res) => {
    try {
        const idsParam = req.query.ids || '';
        const ids = idsParam
            .split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));

        if (ids.length === 0) {
            return res.status(400).json({ success: false, error: 'No valid phone IDs provided for comparison' });
        }

        const phones = db.getPhonesByIds(ids);
        res.json({
            success: true,
            count: phones.length,
            data: phones
        });
    } catch (err) {
        console.error('Error comparing phones:', err);
        res.status(500).json({
            success: false,
            error: 'Comparison failed',
            details: err.message
        });
    }
});

/**
 * @route   GET /api/stats
 * @desc    Get dashboard metrics, brand price distribution, and insights
 */
router.get('/stats', (req, res) => {
    try {
        const stats = db.getStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (err) {
        console.error('Error retrieving stats:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve dashboard metrics',
            details: err.message
        });
    }
});

/**
 * @route   GET /api/export
 * @desc    Export mobile phone data as CSV or JSON
 * @query   format (json | csv)
 */
router.get('/export', (req, res) => {
    try {
        const format = (req.query.format || 'json').toLowerCase();
        const allData = db.getPhones({ limit: 1000 }).phones;

        if (format === 'csv') {
            if (allData.length === 0) {
                return res.send('No data available');
            }
            const headers = [
                'ID', 'ASIN', 'Brand', 'Model', 'Variant', 'Storage (GB)', 'RAM (GB)',
                'Processor', 'Battery (mAh)', 'Price (INR)', 'Original Price',
                'Discount (%)', 'Rating', 'Reviews', 'Amazon URL'
            ];
            const rows = allData.map(p => [
                p.id,
                `"${p.asin}"`,
                `"${p.brand}"`,
                `"${p.model_name}"`,
                `"${p.variant || ''}"`,
                p.storage_gb || '',
                p.ram_gb || '',
                `"${p.processor || ''}"`,
                p.battery_mah || '',
                p.price,
                p.original_price || p.price,
                p.discount_percent || 0,
                p.rating || 0,
                p.review_count || 0,
                `"${p.amazon_url}"`
            ].join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="cht_mobile_intelligence_data.csv"');
            return res.send(csvContent);
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="cht_mobile_intelligence_data.json"');
        res.json(allData);
    } catch (err) {
        console.error('Error exporting data:', err);
        res.status(500).json({ success: false, error: 'Export failed' });
    }
});

module.exports = router;

