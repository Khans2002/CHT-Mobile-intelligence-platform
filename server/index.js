// =================================================================
// CHT Mobile Intelligence Platform - Node.js Server Entry Point
// =================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const scraperRoutes = require('./routes/scraper');
const { db } = require('../database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path.startsWith('/api')) {
            console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API routes
app.use('/api', apiRoutes);
app.use('/api/scraper', scraperRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        service: 'CHT Mobile Intelligence Platform',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
    });
});

// Single Page Application (SPA) fallback to index.html for client-side navigation
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, '../public/index.html'));
    }
    next();
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Application Error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start Server
const server = app.listen(PORT, () => {
    console.log('=============================================================');
    console.log(`🚀 CHT Mobile Intelligence Platform running at:`);
    console.log(`👉 http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📱 Devices API: http://localhost:${PORT}/api/phones`);
    console.log(`🔍 Instant Search: http://localhost:${PORT}/api/search?q=s24`);
    console.log('=============================================================');
});

// Graceful Shutdown
function handleShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
        console.log('🔌 HTTP Server closed.');
        try {
            db.close();
            console.log('💾 SQLite Database connection closed cleanly.');
        } catch (e) {
            console.error('Error closing DB:', e.message);
        }
        process.exit(0);
    });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = { app, server };
