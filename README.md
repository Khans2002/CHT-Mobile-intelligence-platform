# 📱 CHT Mobile Intelligence Platform
> **Enterprise Smartphone Intelligence & Market Analytics Engine**

A high-performance full-stack market intelligence platform engineered with **Node.js (v20+)** as the primary backend runtime and **SQLite 3** as the high-throughput local embedded database. The system continuously extracts, parses, structures, and visualizes retail smartphone listings from Amazon India, specifically targeting **Apple (iPhone)** and **Samsung (Galaxy)** ecosystems.

---

## 🌟 Core Capabilities

- **Primary Runtime:** Node.js (Express.js REST API + Single-Page Application interface)
- **High-Throughput Relational Storage:** Embedded SQLite 3 via `better-sqlite3` configured with **Write-Ahead Logging (WAL)** and **Full-Text Search (FTS5)**.
- **Dual Scraping Subsystem:**
  - **Node.js Native Crawler:** High-speed crawler utilizing native Fetch, regex spec extraction, and transactional batch upserts.
  - **Python BeautifulSoup Crawler:** Resilient crawler featuring desktop User-Agent rotation, browser header spoofing, polite rate limiting, and an automated baseline fallback policy for continuous service availability.
- **Hardware Intelligence Extraction:** Automatically structures unstructured e-commerce listings into granular hardware parameters:
  - Processor / Chipset (Apple A18 Pro, A17 Pro, A16 Bionic, Snapdragon 8 Gen 3 for Galaxy, Exynos 2400, etc.)
  - RAM Capacity (4GB, 6GB, 8GB, 12GB) & Internal Storage (128GB, 256GB, 512GB, 1TB)
  - Battery Capacity (mAh), Display Technology, Multi-Lens Camera Systems, and OS versions
  - Market Pricing, Original List Price (MRP), Discount Margins, and Customer Ratings
- **Instant Search & Analytics:** Debounced instant autocomplete, multi-faceted filtering (Brand, Price Presets, RAM, Storage), and interactive side-by-side hardware comparison.
- **Enterprise Data Export:** Instant one-click extraction into structured **CSV** and **JSON** formats.

---

## 🏗️ System Architecture

```
====================================================================================================
                                CLIENT TIER (Web Dashboard)
====================================================================================================
+--------------------------------------------------------------------------------------------------+
|                                    MODERN WEB DASHBOARD                                          |
|                                                                                                  |
|   [Instant Search Bar]       [Brand Filters: Apple | Samsung]        [Price Range Presets]        |
|            |                                |                                  |                 |
|            v                                v                                  v                 |
|   (Debounced Autocomplete)      (Faceted Spec Filtering)             (Dynamic Price Buckets)     |
|                                                                                                  |
|   +---------------------------------------+  +------------------------------------------------+  |
|   |   Dynamic Product Cards Grid          |  |   Side-by-Side Hardware Comparison Matrix      |  |
|   |   - High-Res Product Visuals          |  |   - Processor vs Processor Comparison          |  |
|   |   - RAM / Storage / Battery Badges    |  |   - RAM & Storage Specs Breakdown              |  |
|   |   - Pricing, MRP & Discount Flags     |  |   - Battery Capacity & Display Tech Matrix     |  |
|   +---------------------------------------+  +------------------------------------------------+  |
|                                                                                                  |
|   +-------------------------------------------------------------------------------------------+  |
|   |   Scraper Control Console (Live Terminal Execution Log Streaming via REST Polling)        |  |
|   +-------------------------------------------------------------------------------------------+  |
+-------------------------------------------------+------------------------------------------------+
                                                  |
                                                  | HTTP / JSON REST Requests (Port 3000)
                                                  v
====================================================================================================
                               APPLICATION TIER (Node.js & Express)
====================================================================================================
+--------------------------------------------------------------------------------------------------+
|                                NODE.JS EXPRESS RUNTIME ENGINE                                    |
|                                                                                                  |
|   +-------------------------+   +--------------------------+   +-----------------------------+   |
|   |   HTTP Middleware       |   |   REST API Router        |   |   Scraper Subprocess IPC    |   |
|   |   - CORS Security       |-->|   - GET /api/phones      |   |   - POST /api/scraper/trigger   |   |
|   |   - JSON Body Parser    |   |   - GET /api/search      |   |   - GET  /api/scraper/status    |   |
|   |   - Request Logger      |   |   - GET /api/compare     |   |   - child_process.spawn         |   |
|   |   - Static Asset Server |   |   - GET /api/stats       |   |     with stdout log stream  |   |
|   +-------------------------+   +--------------------------+   +--------------+--------------+   |
+-----------------------------------------------+-------------------------------+------------------+
                                                |                               |
                                                | Direct Database Query         | Spawns Child Scraper
                                                v                               v
====================================================================================================
               PERSISTENCE TIER (SQLite 3)             |        SCRAPING & INGESTION SUBSYSTEM
====================================================================================================
+------------------------------------------------------+   +---------------------------------------+
|                 SQLITE 3 DATABASE                    |   |        SCRAPER IMPLEMENTATIONS        |
|               (database/phones.db)                   |   |                                       |
|                                                      |   |  1. Node.js Native Crawler            |
|   +----------------------------------------------+   |   |     - scraper/amazon_scraper.js       |
|   |  PRAGMA Configurations:                      |   |   |     - Native Fetch API + Spec Regex   |
|   |  - PRAGMA journal_mode = WAL (Concurrency)   |   |   |     - Direct better-sqlite3 Upsert    |
|   |  - PRAGMA synchronous = NORMAL               |   |   |                                       |
|   +----------------------------------------------+   |   |  2. Python BeautifulSoup Crawler      |
|                                                      |   |     - scraper/amazon_scraper.py       |
|   +----------------------------------------------+   |   |     - Requests + BeautifulSoup4       |
|   |  Main Relational Table: 'phones'             |   |   |     - User-Agent Rotation             |
|   |  - asin, brand, model_name, variant          |<------+     - Anti-Bot Fallback Safeguard     |
|   |  - processor, ram_gb, storage_gb, battery    |   |   +-------------------+-------------------+
|   |  - display_spec, camera_spec, os             |   |                       |
|   |  - price, original_price, discount, rating   |   |                       |
|   +----------------------------------------------+   |                       |
|                                                      |                       v
|   +----------------------------------------------+   |   +---------------------------------------+
|   |  Full-Text Search Virtual Table:             |   |   |           TARGET DATA SOURCE          |
|   |  - 'phones_fts' (FTS5)                       |   |   |                                       |
|   |  - Synchronized via DB Triggers (AI, AU, AD) |   |   |       Amazon India (amazon.in)        |
|   +----------------------------------------------+   |   |       - Apple Search Endpoints        |
|                                                      |   |       - Samsung Search Endpoints      |
|   +----------------------------------------------+   |   +---------------------------------------+
|   |  Audit Table: 'scrape_logs'                  |   |
|   +----------------------------------------------+   |
+------------------------------------------------------+
====================================================================================================
```

---

## 🚀 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Khans2002/CHT-Mobile-intelligence-platform.git
cd CHT-Mobile-intelligence-platform
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify System Health
Run the automated database test check:
```bash
npm test
```
*Expected output: `SQLite Ready. Total devices: 75`*

### 4. Start the Application Server
```bash
npm start
```
The application will launch at:  
👉 **`http://localhost:3000`**

---

## 📡 REST API Reference

| Endpoint | Method | Description | Sample Query |
| :--- | :--- | :--- | :--- |
| `/api/phones` | `GET` | Paginated mobile devices with multi-faceted filters | `/api/phones?brand=Apple&minPrice=50000` |
| `/api/search` | `GET` | High-speed autocomplete & search suggestions | `/api/search?q=s24` |
| `/api/phones/:id` | `GET` | Complete hardware specification sheet for a device | `/api/phones/1` |
| `/api/compare` | `GET` | Side-by-side hardware comparison for selected IDs | `/api/compare?ids=1,10,14` |
| `/api/stats` | `GET` | Aggregate market metrics, brand counts & averages | `/api/stats` |
| `/api/export` | `GET` | Export currently tracked data as CSV or JSON | `/api/export?format=csv` |
| `/api/scraper/trigger`| `POST`| Asynchronously trigger background scraping job | `{"brand":"All","pages":1}` |
| `/api/scraper/status` | `GET` | Inspect active scraper execution state and logs | `/api/scraper/status` |
| `/api/scraper/history`| `GET` | Retrieve past scrape execution logs from database | `/api/scraper/history?limit=10` |
| `/api/health` | `GET` | Application health status and runtime telemetry | `/api/health` |

---

## 🛠️ Technology Stack Breakdown

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js (v20 LTS)** | Non-blocking event-driven I/O engine hosting API services |
| **Web Framework** | **Express.js (v4.21)** | Fast, unopinionated routing, middleware, and static asset pipeline |
| **Database Engine** | **SQLite 3 (v3.45+)** | High-performance embedded relational storage |
| **Database Driver** | **better-sqlite3 (v11.8)** | Synchronous, compiled prepared statements with WAL concurrency |
| **Full-Text Search** | **SQLite FTS5** | Virtual table with self-synchronizing triggers for sub-millisecond search |
| **Scraping Engine** | **Node.js & Python** | Native Fetch crawler + Python BeautifulSoup4 with User-Agent rotation |
| **Subprocess IPC** | **Node `child_process.spawn`** | Asynchronous execution with real-time `stdout` log streaming |
| **Client Interface** | **Modern Vanilla JS & CSS3** | Glassmorphism dashboard, debounced instant search, no bundler overhead |

---

## 📂 Project Structure

```
CHT-Mobile-intelligence-platform/
├── database/
│   ├── schema.sql                 # DDL: tables, indexes, triggers, FTS5 virtual table
│   ├── db.js                      # DAO layer using better-sqlite3 with WAL configuration
│   ├── seed_data.json             # Baseline verified smartphone hardware catalogue
│   └── phones.db                  # Persistent SQLite database file
├── scraper/
│   ├── amazon_scraper.js          # Native Node.js scraper (Fetch + Regex Spec Parser)
│   └── amazon_scraper.py          # Python BeautifulSoup scraper with anti-bot resilience
├── server/
│   ├── routes/
│   │   ├── api.js                 # REST API endpoints (search, compare, stats, export)
│   │   └── scraper.js             # Scraper subprocess IPC controller with log streaming
│   └── index.js                   # Express application entry point & graceful shutdown
├── public/
│   ├── index.html                 # Semantic HTML5 executive dashboard layout
│   ├── css/
│   │   └── style.css              # Custom CSS3 variables, dark theme & responsive grids
│   └── js/
│       └── app.js                 # Client-side controller (instant search, state, compare)
├── .gitignore                     # Git configuration excluding node_modules, venvs, and logs
├── package.json                   # Project metadata, scripts, and production dependencies
└── README.md                      # Comprehensive project documentation
```

---

## 🛡️ License

This project is licensed under the ISC License. All rights reserved.
