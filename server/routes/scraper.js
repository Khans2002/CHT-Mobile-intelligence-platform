// =================================================================
// CHT Mobile Intelligence Platform - Scraper Control Router
// Orchestrates Python scraper subprocess from Node.js with live streaming logs
// =================================================================

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../../database/db');

// Paths
const BASE_DIR = path.resolve(__dirname, '../../');
const SCRAPER_SCRIPT = path.join(BASE_DIR, 'scraper', 'amazon_scraper.py');
const VENV_PYTHON = path.join(BASE_DIR, '.venv', 'bin', 'python3');
const SYSTEM_PYTHON = 'python3';

// Determine best python binary (prefer virtualenv)
const pythonExecutable = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : SYSTEM_PYTHON;

// In-memory scraper execution state
let scraperState = {
    isRunning: false,
    brand: null,
    startedAt: null,
    finishedAt: null,
    logs: [],
    exitCode: null,
    error: null
};

/**
 * @route   POST /api/scraper/trigger
 * @desc    Triggers the Python Amazon scraper asynchronously
 * @body    brand ('Apple' | 'Samsung' | 'All'), pages (number)
 */
router.post('/trigger', (req, res) => {
    if (scraperState.isRunning) {
        return res.status(409).json({
            success: false,
            message: 'A scraping job is already actively running. Please wait for it to complete.',
            state: scraperState
        });
    }

    const brand = req.body.brand || 'All';
    const pages = parseInt(req.body.pages, 10) || 1;

    // Reset state
    scraperState = {
        isRunning: true,
        brand,
        pages,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        logs: [`[${new Date().toLocaleTimeString()}] Triggering Python Amazon Scraper for brand: ${brand} (Pages: ${pages})...`],
        exitCode: null,
        error: null
    };

    const args = [SCRAPER_SCRIPT, '--brand', brand, '--pages', String(pages), '--format', 'db'];

    const child = spawn(pythonExecutable, args, {
        cwd: BASE_DIR,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    child.stdout.on('data', (data) => {
        const text = data.toString();
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        lines.forEach(line => {
            scraperState.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
            // Keep last 100 log lines
            if (scraperState.logs.length > 100) scraperState.logs.shift();
        });
    });

    child.stderr.on('data', (data) => {
        const text = data.toString();
        scraperState.logs.push(`[${new Date().toLocaleTimeString()}] [WARN] ${text.trim()}`);
    });

    child.on('error', (err) => {
        scraperState.isRunning = false;
        scraperState.finishedAt = new Date().toISOString();
        scraperState.error = err.message;
        scraperState.logs.push(`[ERROR] Failed to launch scraper process: ${err.message}`);
    });

    child.on('close', (code) => {
        scraperState.isRunning = false;
        scraperState.finishedAt = new Date().toISOString();
        scraperState.exitCode = code;
        scraperState.logs.push(`[${new Date().toLocaleTimeString()}] Scraper process finished with exit code ${code}.`);
    });

    // Return immediate response with job status
    res.json({
        success: true,
        message: 'Scraping process launched successfully in background.',
        state: scraperState
    });
});

/**
 * @route   GET /api/scraper/status
 * @desc    Poll the current status and latest logs of the scraper
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        state: scraperState
    });
});

/**
 * @route   GET /api/scraper/history
 * @desc    Get historical scrape logs recorded in SQLite
 */
router.get('/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const history = db.getScrapeLogs(limit);
        res.json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

