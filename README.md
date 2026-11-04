# 📱 CHT Mobile Intelligence Platform
> **Enterprise Amazon Mobile Phone Scraper, Hardware Intelligence Analytics & Real-Time Search Dashboard**

Built specifically with **Node.js (v20+)** as the primary programming runtime, **SQLite** as the high-throughput local embedded database, and dual-mode **Python / Node.js scrapers** for comprehensive market data extraction across **Apple (iPhone)** and **Samsung (Galaxy)** smartphones.

---

## 🌟 Executive Highlights

- **Primary Runtime:** Node.js (Express.js REST API + Static Single-Page Application)
- **Database Engine:** SQLite 3 via `better-sqlite3` with **Write-Ahead Logging (WAL)** and **Full-Text Search (FTS5)**.
- **Scraping Subsystem:**
  - **Node.js Native Scraper:** High-speed crawler utilizing native Fetch, regex hardware spec parsers, and direct SQLite transactions.
  - **Python BeautifulSoup Scraper:** Resilient crawler with randomized desktop User-Agents, anti-bot mitigation, and graceful fallback catalogue for guaranteed demo uptime.
- **Hardware Intelligence Extraction:** Extracts processor/chipset (e.g. A18 Pro, Snapdragon 8 Gen 3), RAM, internal storage, battery capacity, display specs, multi-lens camera systems, live INR prices, discounts, and Amazon URLs.
- **Instant Search & Analytics:** Real-time debounced autocomplete search, multi-faceted filtering (Brand, RAM, Storage, Price presets), side-by-side spec comparison matrix, and interactive device cards.

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------------+
|                  CLIENT BROWSER (MacBook Air M1 / Web UI)                |
|  - Instant Search Bar (Debounced Autocomplete)                         |
|  - Brand Tabs (All / Apple / Samsung)                                   |
|  - Faceted Filters (Price presets, RAM, Storage, Sorting)               |
|  - Comparison Matrix (Side-by-side hardware spec comparison)            |
|  - Scraper Control Modal (Live log streaming from scraper subprocess)   |
+------------------------------------+------------------------------------+
                                     |  HTTP REST (Port 3000)
                                     v
+-------------------------------------------------------------------------+
|                        NODE.JS SERVER (server/index.js)                 |
|  - Express.js Router: /api/phones, /api/search, /api/compare, /api/stats|
|  - Scraper Orchestrator: /api/scraper/trigger & /api/scraper/status     |
|  - Inter-Process Communication (IPC): child_process.spawn               |
+-------------------+---------------------------------+-------------------+
                    |                                 |
                    v (Direct DAO)                    v (Child Process)
+--------------------------------------+   +------------------------------+
|        SQLITE 3 DATABASE ENGINE      |   |   AMAZON SCRAPING ENGINES    |
|        (database/phones.db)          |   |                              |
|  - WAL Mode (High-throughput writes) |<--+ 1. Node.js Native Scraper    |
|  - FTS5 Full-Text Search Table       |   |    (scraper/amazon_scraper.js|
|  - Indexes: brand, price, RAM, ROM   |   | 2. Python BS4 Scraper        |
|  - Automated Audit Logging           |   |    (scraper/amazon_scraper.py|
+--------------------------------------+   +------------------------------+
```

---

## 🚀 Quick Start Guide (MacBook Air M1)

### 1. Prerequisites Check
Your MacBook Air M1 already has Node.js and Python installed:
```bash
node -v      # v20.20.1 (or higher)
npm -v       # 10.8.2
python3 --version
```

### 2. Start the Node.js Application
From the project directory:
```bash
npm start
```
The application will launch at:
👉 **http://localhost:3000**

### 3. Run Scraper Manually (Optional)
You can trigger scraping either via the web dashboard's **"Trigger Scraper"** button or via command line:
```bash
# Option A: Run native Node.js scraper
npm run scrape:node

# Option B: Run Python scraper (with virtualenv)
source .venv/bin/activate
python scraper/amazon_scraper.py --brand All --pages 1 --format db
```

---

## 📡 REST API Reference

| Endpoint | Method | Description | Sample Query |
| :--- | :--- | :--- | :--- |
| `/api/phones` | `GET` | Paginated devices with filters | `/api/phones?brand=Apple&minPrice=50000` |
| `/api/search` | `GET` | Lightning-fast search suggestions | `/api/search?q=s24` |
| `/api/phones/:id` | `GET` | Complete hardware specs for a device | `/api/phones/1` |
| `/api/compare` | `GET` | Side-by-side hardware comparison | `/api/compare?ids=1,10,14` |
| `/api/stats` | `GET` | Aggregate market prices & brand metrics | `/api/stats` |
| `/api/export` | `GET` | Download dataset as CSV or JSON | `/api/export?format=csv` |
| `/api/scraper/trigger`| `POST`| Asynchronously trigger scraper job | `{"brand":"All","pages":1}` |
| `/api/scraper/status` | `GET` | Check scraper running state & logs | `/api/scraper/status` |
| `/api/health` | `GET` | Node.js server health status | `/api/health` |

---

## 📂 Project Directory Structure

```
CHT Mobile intelligence platform/
├── .venv/                         # Python Virtual Environment
├── database/
│   ├── schema.sql                 # SQLite tables, indexes, triggers, FTS5 virtual table
│   ├── db.js                      # DAO layer using better-sqlite3
│   ├── seed_data.json             # Verified catalogue of 20+ flagship mobile phones
│   └── phones.db                  # Live SQLite database file (WAL mode)
├── scraper/
│   ├── amazon_scraper.js          # Native Node.js Amazon scraper (Fetch + Regex)
│   └── amazon_scraper.py          # Python BeautifulSoup scraper with anti-bot resilience
├── server/
│   ├── routes/
│   │   ├── api.js                 # REST API endpoints (search, phones, stats, export)
│   │   └── scraper.js             # Scraper IPC controller with live log streaming
│   └── index.js                   # Main Express.js server entry point
├── public/
│   ├── index.html                 # Modern glassmorphism dashboard UI
│   ├── css/
│   │   └── style.css              # Custom styling, dark mode, responsive cards
│   └── js/
│       └── app.js                 # Frontend application logic & instant search
├── package.json                   # Node.js dependencies & scripts
└── README.md                      # Documentation & getting started
```

---

## 👥 Interview & Architecture Materials
Full comprehensive documentation, ASCII architectural diagrams, tech stack justifications, and interview Q&A can be found in:
`/Users/mohammedsameerkhan/Developer/Company Projects/Materials/`

