// =================================================================
// CHT Mobile Intelligence Platform - Client-Side Controller
// Handles instant search, multi-faceted filtering, specs comparison,
// dynamic grid/table rendering, and live scraper management.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Application State
    const state = {
        brand: 'All',
        search: '',
        pricePreset: 'All',
        ram: 'All',
        storage: 'All',
        sort: 'rating',
        order: 'desc',
        page: 1,
        limit: 12,
        view: 'grid',
        compareIds: new Set(),
        searchDebounceTimer: null,
        scraperPollTimer: null
    };

    // DOM Elements
    const elements = {
        phonesGrid: document.getElementById('phonesGrid'),
        phonesTableWrapper: document.getElementById('phonesTableWrapper'),
        phonesTableBody: document.getElementById('phonesTableBody'),
        resultsCount: document.getElementById('resultsCount'),
        activeQueryTag: document.getElementById('activeQueryTag'),
        pageNumbers: document.getElementById('pageNumbers'),
        btnPrevPage: document.getElementById('btnPrevPage'),
        btnNextPage: document.getElementById('btnNextPage'),
        mainSearchInput: document.getElementById('mainSearchInput'),
        btnClearSearch: document.getElementById('btnClearSearch'),
        searchDropdown: document.getElementById('searchDropdown'),
        filterPricePreset: document.getElementById('filterPricePreset'),
        filterRam: document.getElementById('filterRam'),
        filterStorage: document.getElementById('filterStorage'),
        filterSort: document.getElementById('filterSort'),
        btnResetFilters: document.getElementById('btnResetFilters'),
        brandTabs: document.querySelectorAll('.brand-tab'),
        btnViewGrid: document.getElementById('btnViewGrid'),
        btnViewTable: document.getElementById('btnViewTable'),
        // Modals
        detailModalOverlay: document.getElementById('detailModalOverlay'),
        detailModalBody: document.getElementById('detailModalBody'),
        btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
        compareModalOverlay: document.getElementById('compareModalOverlay'),
        compareModalBody: document.getElementById('compareModalBody'),
        btnCloseCompareModal: document.getElementById('btnCloseCompareModal'),
        btnOpenCompare: document.getElementById('btnOpenCompare'),
        compareCount: document.getElementById('compareCount'),
        compareTray: document.getElementById('compareTray'),
        trayCount: document.getElementById('trayCount'),
        btnLaunchCompare: document.getElementById('btnLaunchCompare'),
        btnClearCompare: document.getElementById('btnClearCompare'),
        // Scraper Modal
        scraperModalOverlay: document.getElementById('scraperModalOverlay'),
        btnOpenScraperModal: document.getElementById('btnOpenScraperModal'),
        btnCloseScraperModal: document.getElementById('btnCloseScraperModal'),
        btnExecuteScrape: document.getElementById('btnExecuteScrape'),
        scraperBrandSelect: document.getElementById('scraperBrandSelect'),
        scraperPagesSelect: document.getElementById('scraperPagesSelect'),
        scraperConsoleOutput: document.getElementById('scraperConsoleOutput'),
        scraperStatusBadge: document.getElementById('scraperStatusBadge'),
        // Stats
        statAvgPrice: document.getElementById('statAvgPrice'),
        statAppleAvg: document.getElementById('statAppleAvg'),
        statSamsungAvg: document.getElementById('statSamsungAvg'),
        statTopRated: document.getElementById('statTopRated'),
        navTotalDevices: document.getElementById('navTotalDevices'),
        navAppleCount: document.getElementById('navAppleCount'),
        navSamsungCount: document.getElementById('navSamsungCount'),
        countAll: document.getElementById('countAll'),
        countApple: document.getElementById('countApple'),
        countSamsung: document.getElementById('countSamsung')
    };

    // Format currency helper
    const formatINR = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    // -------------------------------------------------------------
    // API FETCH FUNCTIONS
    // -------------------------------------------------------------

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const json = await res.json();
            if (json.success && json.data) {
                const s = json.data;
                elements.statAvgPrice.textContent = formatINR(s.avgPrice);
                elements.statAppleAvg.textContent = formatINR(s.avgApplePrice);
                elements.statSamsungAvg.textContent = formatINR(s.avgSamsungPrice);
                
                elements.navTotalDevices.textContent = `Tracking ${s.totalDevices} Devices`;
                elements.navAppleCount.textContent = `Apple: ${s.appleCount}`;
                elements.navSamsungCount.textContent = `Samsung: ${s.samsungCount}`;
                
                elements.countAll.textContent = s.totalDevices;
                elements.countApple.textContent = s.appleCount;
                elements.countSamsung.textContent = s.samsungCount;
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    async function loadPhones() {
        showLoadingState();

        const params = new URLSearchParams();
        if (state.brand && state.brand !== 'All') params.append('brand', state.brand);
        if (state.search) params.append('search', state.search);
        if (state.ram && state.ram !== 'All') params.append('ram', state.ram);
        if (state.storage && state.storage !== 'All') params.append('storage', state.storage);

        // Price presets
        if (state.pricePreset === 'under30k') {
            params.append('maxPrice', '30000');
        } else if (state.pricePreset === '30k-70k') {
            params.append('minPrice', '30000');
            params.append('maxPrice', '70000');
        } else if (state.pricePreset === '70k-100k') {
            params.append('minPrice', '70000');
            params.append('maxPrice', '100000');
        } else if (state.pricePreset === 'above100k') {
            params.append('minPrice', '100000');
        }

        params.append('sort', state.sort);
        params.append('order', state.order);
        params.append('page', state.page);
        params.append('limit', state.limit);

        try {
            const res = await fetch(`/api/phones?${params.toString()}`);
            const json = await res.json();

            if (json.success && json.data) {
                renderResults(json.data);
            } else {
                renderEmptyState('Failed to fetch mobile phones.');
            }
        } catch (err) {
            console.error('Error loading phones:', err);
            renderEmptyState('Network error connecting to API.');
        }
    }

    function showLoadingState() {
        elements.phonesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <div class="pulse-dot" style="margin: 0 auto 16px; width: 14px; height: 14px;"></div>
                <p style="color: var(--text-secondary);">Querying SQLite database...</p>
            </div>
        `;
    }

    // -------------------------------------------------------------
    // RENDER FUNCTIONS
    // -------------------------------------------------------------

    function renderResults(data) {
        const { phones, total, page, totalPages } = data;

        // Update counts
        elements.resultsCount.textContent = `Showing ${phones.length} of ${total} mobile phones`;

        if (state.search) {
            elements.activeQueryTag.style.display = 'inline-block';
            elements.activeQueryTag.textContent = `Search: "${state.search}"`;
        } else {
            elements.activeQueryTag.style.display = 'none';
        }

        if (phones.length === 0) {
            renderEmptyState(`No phones found matching your criteria.`);
            elements.pageNumbers.innerHTML = '';
            elements.btnPrevPage.disabled = true;
            elements.btnNextPage.disabled = true;
            return;
        }

        // Render Grid
        renderGrid(phones);

        // Render Table
        renderTable(phones);

        // Render Pagination
        renderPagination(page, totalPages);
    }

    function renderEmptyState(message) {
        const emptyHtml = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
                <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">No Mobile Phones Found</h3>
                <p style="color: var(--text-secondary); max-width: 450px; margin: 0 auto 20px;">${message}</p>
                <button class="btn btn-primary btn-sm" id="btnEmptyReset">Reset Search & Filters</button>
            </div>
        `;
        elements.phonesGrid.innerHTML = emptyHtml;
        elements.phonesTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px;">${message}</td></tr>`;

        const resetBtn = document.getElementById('btnEmptyReset');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetAllFilters);
        }
    }

    function renderGrid(phones) {
        elements.phonesGrid.innerHTML = phones.map(phone => {
            const isApple = phone.brand.toLowerCase() === 'apple';
            const brandBadgeClass = isApple ? 'brand-badge apple' : 'brand-badge samsung';
            const isCompared = state.compareIds.has(phone.id);
            const compareBtnText = isCompared ? '✓ Added' : '+ Compare';
            const compareBtnClass = isCompared ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm';

            return `
                <div class="phone-card" data-id="${phone.id}">
                    <div class="phone-header">
                        <div class="card-badges">
                            <span class="${brandBadgeClass}">${phone.brand}</span>
                            ${phone.discount_percent > 0 ? `<span class="discount-badge">${phone.discount_percent}% OFF</span>` : ''}
                        </div>
                        <div class="phone-image-wrapper">
                            <img src="${phone.image_url}" alt="${phone.model_name}" class="phone-image" loading="lazy" onerror="this.src='https://m.media-amazon.com/images/I/71RVuWl+CeL._SL1500_.jpg'"/>
                        </div>
                    </div>

                    <div class="phone-body">
                        <h3 class="phone-model" title="${phone.model_name}">${phone.model_name}</h3>
                        <p class="phone-variant" title="${phone.variant || ''}">${phone.variant || 'Standard Edition'}</p>

                        <div class="specs-pills">
                            <div class="spec-item">
                                <span class="spec-icon">⚡</span>
                                <span class="spec-value">${phone.processor || 'High-Performance Chip'}</span>
                            </div>
                            <div class="spec-item">
                                <span class="spec-icon">💾</span>
                                <span class="spec-value">${phone.ram_gb || 8}GB RAM • ${phone.storage_gb || 128}GB ROM</span>
                            </div>
                            <div class="spec-item">
                                <span class="spec-icon">🔋</span>
                                <span class="spec-value">${phone.battery_mah || 4500} mAh Battery</span>
                            </div>
                            <div class="spec-item">
                                <span class="spec-icon">📷</span>
                                <span class="spec-value">${phone.camera_spec || 'Multi-Lens Camera'}</span>
                            </div>
                        </div>

                        <div class="phone-price-row">
                            <div>
                                <span class="current-price">${formatINR(phone.price)}</span>
                                ${phone.original_price && phone.original_price > phone.price ? `<span class="original-price">${formatINR(phone.original_price)}</span>` : ''}
                            </div>
                            <div class="rating-badge">
                                <span>★</span>
                                <span>${phone.rating.toFixed(1)}</span>
                                <span style="font-size: 0.65rem; color: var(--text-muted);">(${phone.review_count})</span>
                            </div>
                        </div>

                        <div class="card-actions">
                            <button class="btn btn-outline btn-sm btn-view-detail" data-id="${phone.id}">
                                Specs Sheet
                            </button>
                            <button class="${compareBtnClass} btn-toggle-compare" data-id="${phone.id}">
                                ${compareBtnText}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderTable(phones) {
        elements.phonesTableBody.innerHTML = phones.map(phone => {
            const isCompared = state.compareIds.has(phone.id);
            return `
                <tr>
                    <td>
                        <div class="table-device-cell">
                            <img src="${phone.image_url}" alt="${phone.model_name}" class="table-thumb" onerror="this.src='https://m.media-amazon.com/images/I/71RVuWl+CeL._SL1500_.jpg'"/>
                            <div>
                                <strong>${phone.model_name}</strong>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${phone.asin}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="brand-badge ${phone.brand.toLowerCase()}">${phone.brand}</span>
                    </td>
                    <td>${phone.variant || 'Standard'}</td>
                    <td>${phone.ram_gb || 8}GB / ${phone.storage_gb || 128}GB</td>
                    <td>${phone.processor || 'Octa-Core'}</td>
                    <td>${phone.battery_mah || 4500} mAh</td>
                    <td>
                        <strong>${formatINR(phone.price)}</strong>
                        ${phone.discount_percent > 0 ? `<div style="font-size: 0.7rem; color: var(--accent-red); font-weight: 700;">-${phone.discount_percent}%</div>` : ''}
                    </td>
                    <td>★ ${phone.rating.toFixed(1)}</td>
                    <td>
                        <div style="display: flex; gap: 6px;">
                            <button class="btn btn-outline btn-sm btn-view-detail" data-id="${phone.id}">Specs</button>
                            <button class="btn btn-outline btn-sm btn-toggle-compare" data-id="${phone.id}">
                                ${isCompared ? '✓' : '+'}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderPagination(currentPage, totalPages) {
        elements.btnPrevPage.disabled = currentPage <= 1;
        elements.btnNextPage.disabled = currentPage >= totalPages;

        let html = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        elements.pageNumbers.innerHTML = html;

        // Attach pagination clicks
        document.querySelectorAll('.page-num').forEach(btn => {
            btn.addEventListener('click', (e) => {
                state.page = parseInt(e.target.dataset.page, 10);
                loadPhones();
                window.scrollTo({ top: 400, behavior: 'smooth' });
            });
        });
    }

    // -------------------------------------------------------------
    // EVENT LISTENERS & DELEGATION (Reliable, single-point event handling)
    // -------------------------------------------------------------

    // Grid Delegation: Handles Detail and Compare button clicks
    elements.phonesGrid.addEventListener('click', (e) => {
        const compareBtn = e.target.closest('.btn-toggle-compare');
        if (compareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(compareBtn.dataset.id, 10);
            toggleCompare(id);
            return;
        }

        const detailBtn = e.target.closest('.btn-view-detail');
        if (detailBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = detailBtn.dataset.id;
            openPhoneDetails(id);
            return;
        }
    });

    // Table Delegation: Handles Detail and Compare button clicks
    elements.phonesTableBody.addEventListener('click', (e) => {
        const compareBtn = e.target.closest('.btn-toggle-compare');
        if (compareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(compareBtn.dataset.id, 10);
            toggleCompare(id);
            return;
        }

        const detailBtn = e.target.closest('.btn-view-detail');
        if (detailBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = detailBtn.dataset.id;
            openPhoneDetails(id);
            return;
        }
    });

    // Instant Autocomplete Search
    elements.mainSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        elements.btnClearSearch.style.display = query ? 'block' : 'none';

        clearTimeout(state.searchDebounceTimer);
        if (query.length < 2) {
            elements.searchDropdown.style.display = 'none';
            return;
        }

        state.searchDebounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    renderSearchDropdown(json.data, query);
                } else {
                    elements.searchDropdown.innerHTML = `
                        <div style="padding: 14px 18px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                            No matching phones found. Press enter to search full database.
                        </div>
                    `;
                    elements.searchDropdown.style.display = 'block';
                }
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        }, 180);
    });

    function renderSearchDropdown(items, query) {
        elements.searchDropdown.innerHTML = items.map(item => `
            <div class="dropdown-item" data-id="${item.id}">
                <img src="${item.image_url}" alt="${item.model_name}" class="dropdown-thumb" onerror="this.src='https://m.media-amazon.com/images/I/71RVuWl+CeL._SL1500_.jpg'"/>
                <div class="dropdown-info">
                    <div class="dropdown-title">${highlightMatch(item.model_name, query)}</div>
                    <div class="dropdown-sub">${item.variant || item.brand}</div>
                </div>
                <div class="dropdown-price">${formatINR(item.price)}</div>
            </div>
        `).join('');

        elements.searchDropdown.style.display = 'block';

        // Item click
        elements.searchDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                elements.searchDropdown.style.display = 'none';
                openPhoneDetails(id);
            });
        });
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span style="color: var(--accent-blue); font-weight: 800;">$1</span>');
    }

    // Submit search on enter
    elements.mainSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            state.search = elements.mainSearchInput.value.trim();
            state.page = 1;
            elements.searchDropdown.style.display = 'none';
            loadPhones();
        }
    });

    // Clear search
    elements.btnClearSearch.addEventListener('click', () => {
        elements.mainSearchInput.value = '';
        elements.btnClearSearch.style.display = 'none';
        elements.searchDropdown.style.display = 'none';
        state.search = '';
        state.page = 1;
        loadPhones();
    });

    // Click outside search closes dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-bar-wrapper')) {
            elements.searchDropdown.style.display = 'none';
        }
    });

    // Quick search chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.dataset.search;
            elements.mainSearchInput.value = query;
            elements.btnClearSearch.style.display = 'block';
            state.search = query;
            state.page = 1;
            loadPhones();
        });
    });

    // Brand Tabs
    elements.brandTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.brandTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.brand = tab.dataset.brand;
            state.page = 1;
            loadPhones();
        });
    });

    // Filters Dropdowns
    elements.filterPricePreset.addEventListener('change', (e) => {
        state.pricePreset = e.target.value;
        state.page = 1;
        loadPhones();
    });

    elements.filterRam.addEventListener('change', (e) => {
        state.ram = e.target.value;
        state.page = 1;
        loadPhones();
    });

    elements.filterStorage.addEventListener('change', (e) => {
        state.storage = e.target.value;
        state.page = 1;
        loadPhones();
    });

    elements.filterSort.addEventListener('change', (e) => {
        const [sortCol, sortDir] = e.target.value.split('-');
        state.sort = sortCol;
        state.order = sortDir;
        state.page = 1;
        loadPhones();
    });

    elements.btnResetFilters.addEventListener('click', resetAllFilters);

    function resetAllFilters() {
        state.brand = 'All';
        state.search = '';
        state.pricePreset = 'All';
        state.ram = 'All';
        state.storage = 'All';
        state.sort = 'rating';
        state.order = 'desc';
        state.page = 1;

        elements.mainSearchInput.value = '';
        elements.btnClearSearch.style.display = 'none';
        elements.searchDropdown.style.display = 'none';
        elements.filterPricePreset.value = 'All';
        elements.filterRam.value = 'All';
        elements.filterStorage.value = 'All';
        elements.filterSort.value = 'rating-desc';

        elements.brandTabs.forEach(t => {
            if (t.dataset.brand === 'All') t.classList.add('active');
            else t.classList.remove('active');
        });

        loadPhones();
    }

    // View Toggles (Grid vs Table)
    elements.btnViewGrid.addEventListener('click', () => {
        elements.btnViewGrid.classList.add('active');
        elements.btnViewTable.classList.remove('active');
        elements.phonesGrid.style.display = 'grid';
        elements.phonesTableWrapper.style.display = 'none';
    });

    elements.btnViewTable.addEventListener('click', () => {
        elements.btnViewTable.classList.add('active');
        elements.btnViewGrid.classList.remove('active');
        elements.phonesGrid.style.display = 'none';
        elements.phonesTableWrapper.style.display = 'block';
    });

    // Pagination Next / Prev
    elements.btnPrevPage.addEventListener('click', () => {
        if (state.page > 1) {
            state.page--;
            loadPhones();
            window.scrollTo({ top: 400, behavior: 'smooth' });
        }
    });

    elements.btnNextPage.addEventListener('click', () => {
        state.page++;
        loadPhones();
        window.scrollTo({ top: 400, behavior: 'smooth' });
    });

    // -------------------------------------------------------------
    // MODALS: PHONE DETAILS & COMPARISON
    // -------------------------------------------------------------

    async function openPhoneDetails(id) {
        try {
            const res = await fetch(`/api/phones/${id}`);
            const json = await res.json();
            if (!json.success || !json.data) return;

            const p = json.data;
            elements.detailModalBody.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-image-box">
                        <img src="${p.image_url}" alt="${p.model_name}" class="detail-img" onerror="this.src='https://m.media-amazon.com/images/I/71RVuWl+CeL._SL1500_.jpg'"/>
                        <div style="margin-top: 16px;">
                            <span class="brand-badge ${p.brand.toLowerCase()}">${p.brand}</span>
                            <div style="font-size: 1.5rem; font-weight: 800; color: #fff; margin: 8px 0;">${formatINR(p.price)}</div>
                            ${p.original_price && p.original_price > p.price ? `<div style="font-size: 0.85rem; color: var(--text-muted); text-decoration: line-through;">MRP: ${formatINR(p.original_price)} (${p.discount_percent}% off)</div>` : ''}
                            <a href="${p.amazon_url}" target="_blank" rel="noopener noreferrer" class="btn btn-primary full-width" style="margin-top: 14px;">
                                View on Amazon &rarr;
                            </a>
                        </div>
                    </div>

                    <div>
                        <h2 style="font-size: 1.4rem; font-weight: 800; margin-bottom: 6px;">${p.model_name}</h2>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">${p.full_title}</p>

                        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                            <div class="rating-badge">★ ${p.rating.toFixed(1)} / 5.0 (${p.review_count} ratings)</div>
                            <div style="background: rgba(16, 185, 129, 0.15); color: var(--accent-green); padding: 3px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 700;">
                                ${p.availability}
                            </div>
                        </div>

                        <h4 style="font-size: 0.95rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 6px; margin-bottom: 12px;">Hardware & Technical Specifications</h4>

                        <table class="detail-spec-table">
                            <tr><td>Processor / Chipset</td><td><strong>${p.processor || 'N/A'}</strong></td></tr>
                            <tr><td>RAM Capacity</td><td>${p.ram_gb ? p.ram_gb + ' GB' : 'N/A'}</td></tr>
                            <tr><td>Internal Storage</td><td>${p.storage_gb ? p.storage_gb + ' GB' : 'N/A'}</td></tr>
                            <tr><td>Battery Capacity</td><td>${p.battery_mah ? p.battery_mah + ' mAh' : 'N/A'}</td></tr>
                            <tr><td>Display Specification</td><td>${p.display_spec || 'N/A'}</td></tr>
                            <tr><td>Camera System</td><td>${p.camera_spec || 'N/A'}</td></tr>
                            <tr><td>Operating System</td><td>${p.os || 'N/A'}</td></tr>
                            <tr><td>Color Variant</td><td>${p.color || 'Standard'}</td></tr>
                            <tr><td>Amazon ASIN</td><td><code>${p.asin}</code></td></tr>
                            <tr><td>Last Scraped At</td><td>${new Date(p.scraped_at).toLocaleString()}</td></tr>
                        </table>
                    </div>
                </div>
            `;
            elements.detailModalOverlay.style.display = 'flex';
        } catch (err) {
            console.error('Error loading phone details:', err);
        }
    }

    elements.btnCloseDetailModal.addEventListener('click', () => {
        elements.detailModalOverlay.style.display = 'none';
    });

    // Comparison Logic
    function toggleCompare(id) {
        if (state.compareIds.has(id)) {
            state.compareIds.delete(id);
        } else {
            if (state.compareIds.size >= 3) {
                alert('You can compare a maximum of 3 devices at once.');
                return;
            }
            state.compareIds.add(id);
        }
        updateCompareUI();
    }

    function updateCompareUI() {
        const count = state.compareIds.size;
        elements.compareCount.textContent = count;
        elements.trayCount.textContent = count;

        if (count > 0) {
            elements.compareTray.style.display = 'block';
        } else {
            elements.compareTray.style.display = 'none';
        }

        // Re-render current list to sync button states
        document.querySelectorAll('.btn-toggle-compare').forEach(btn => {
            const id = parseInt(btn.dataset.id, 10);
            if (state.compareIds.has(id)) {
                btn.textContent = '✓ Added';
                btn.className = 'btn btn-primary btn-sm btn-toggle-compare';
            } else {
                btn.textContent = '+ Compare';
                btn.className = 'btn btn-outline btn-sm btn-toggle-compare';
            }
        });
    }

    async function launchCompareModal() {
        if (state.compareIds.size === 0) {
            alert('Please select at least 1 or 2 mobile phones to compare.');
            return;
        }

        const ids = Array.from(state.compareIds).join(',');
        try {
            const res = await fetch(`/api/compare?ids=${ids}`);
            const json = await res.json();
            if (!json.success || !json.data) return;

            const phones = json.data;
            renderCompareMatrix(phones);
            elements.compareModalOverlay.style.display = 'flex';
        } catch (err) {
            console.error('Comparison error:', err);
        }
    }

    function renderCompareMatrix(phones) {
        elements.compareModalBody.innerHTML = `
            <table class="compare-matrix-table">
                <thead>
                    <tr>
                        <th>Specification</th>
                        ${phones.map(p => `
                            <th>
                                <div class="compare-device-header">
                                    <img src="${p.image_url}" alt="${p.model_name}" class="compare-img" onerror="this.src='https://m.media-amazon.com/images/I/71RVuWl+CeL._SL1500_.jpg'"/>
                                    <div>
                                        <span class="brand-badge ${p.brand.toLowerCase()}">${p.brand}</span>
                                        <div style="font-size: 0.95rem; font-weight: 700; margin-top: 4px;">${p.model_name}</div>
                                        <div style="font-size: 1.1rem; color: var(--accent-green); font-weight: 800;">${formatINR(p.price)}</div>
                                    </div>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Processor</td>${phones.map(p => `<td><strong>${p.processor || 'N/A'}</strong></td>`).join('')}</tr>
                    <tr><td>RAM</td>${phones.map(p => `<td>${p.ram_gb || 'N/A'} GB</td>`).join('')}</tr>
                    <tr><td>Storage</td>${phones.map(p => `<td>${p.storage_gb || 'N/A'} GB</td>`).join('')}</tr>
                    <tr><td>Battery</td>${phones.map(p => `<td><strong>${p.battery_mah || 'N/A'} mAh</strong></td>`).join('')}</tr>
                    <tr><td>Display</td>${phones.map(p => `<td>${p.display_spec || 'N/A'}</td>`).join('')}</tr>
                    <tr><td>Camera</td>${phones.map(p => `<td>${p.camera_spec || 'N/A'}</td>`).join('')}</tr>
                    <tr><td>OS</td>${phones.map(p => `<td>${p.os || 'N/A'}</td>`).join('')}</tr>
                    <tr><td>Rating</td>${phones.map(p => `<td>★ ${p.rating.toFixed(1)} (${p.review_count} reviews)</td>`).join('')}</tr>
                    <tr>
                        <td>Buy Link</td>
                        ${phones.map(p => `
                            <td>
                                <a href="${p.amazon_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm">
                                    Amazon Store &rarr;
                                </a>
                            </td>
                        `).join('')}
                    </tr>
                </tbody>
            </table>
        `;
    }

    elements.btnOpenCompare.addEventListener('click', launchCompareModal);
    elements.btnLaunchCompare.addEventListener('click', launchCompareModal);
    elements.btnCloseCompareModal.addEventListener('click', () => {
        elements.compareModalOverlay.style.display = 'none';
    });

    elements.btnClearCompare.addEventListener('click', () => {
        state.compareIds.clear();
        updateCompareUI();
    });

    // -------------------------------------------------------------
    // SCRAPER CONTROL MODAL & LOG STREAMING
    // -------------------------------------------------------------

    elements.btnOpenScraperModal.addEventListener('click', () => {
        elements.scraperModalOverlay.style.display = 'flex';
        checkScraperStatus();
    });

    elements.btnCloseScraperModal.addEventListener('click', () => {
        elements.scraperModalOverlay.style.display = 'none';
    });

    // Close modals on overlay backdrop click
    [elements.detailModalOverlay, elements.compareModalOverlay, elements.scraperModalOverlay].forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.style.display = 'none';
        });
    });

    elements.btnExecuteScrape.addEventListener('click', async () => {
        const brand = elements.scraperBrandSelect.value;
        const pages = elements.scraperPagesSelect.value;

        elements.btnExecuteScrape.disabled = true;
        elements.scraperStatusBadge.textContent = 'Running...';
        elements.scraperStatusBadge.className = 'status-running';
        elements.scraperConsoleOutput.textContent = `[${new Date().toLocaleTimeString()}] Initiating scraping process for ${brand}...\n`;

        try {
            const res = await fetch('/api/scraper/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand, pages })
            });

            const json = await res.json();
            if (json.success) {
                startScraperPolling();
            } else {
                elements.scraperConsoleOutput.textContent += `[ERROR] ${json.message}\n`;
                elements.btnExecuteScrape.disabled = false;
                elements.scraperStatusBadge.textContent = 'Error';
                elements.scraperStatusBadge.className = 'status-error';
            }
        } catch (err) {
            elements.scraperConsoleOutput.textContent += `[ERROR] Request failed: ${err.message}\n`;
            elements.btnExecuteScrape.disabled = false;
        }
    });

    function startScraperPolling() {
        clearInterval(state.scraperPollTimer);
        state.scraperPollTimer = setInterval(async () => {
            await checkScraperStatus();
        }, 1500);
    }

    async function checkScraperStatus() {
        try {
            const res = await fetch('/api/scraper/status');
            const json = await res.json();

            if (json.success && json.state) {
                const s = json.state;
                if (s.logs && s.logs.length > 0) {
                    elements.scraperConsoleOutput.textContent = s.logs.join('\n');
                    elements.scraperConsoleOutput.scrollTop = elements.scraperConsoleOutput.scrollHeight;
                }

                if (s.isRunning) {
                    elements.scraperStatusBadge.textContent = 'Running...';
                    elements.scraperStatusBadge.className = 'status-running';
                    elements.btnExecuteScrape.disabled = true;
                } else {
                    if (state.scraperPollTimer) {
                        clearInterval(state.scraperPollTimer);
                        state.scraperPollTimer = null;
                        // Scrape just completed! Refresh database stats and phone list
                        fetchStats();
                        loadPhones();
                    }
                    elements.btnExecuteScrape.disabled = false;
                    if (s.exitCode === 0) {
                        elements.scraperStatusBadge.textContent = 'Completed (Exit 0)';
                        elements.scraperStatusBadge.className = 'status-success';
                    } else if (s.exitCode !== null) {
                        elements.scraperStatusBadge.textContent = `Finished (${s.exitCode})`;
                        elements.scraperStatusBadge.className = 'status-error';
                    } else {
                        elements.scraperStatusBadge.textContent = 'Idle';
                        elements.scraperStatusBadge.className = 'status-idle';
                    }
                }
            }
        } catch (err) {
            console.error('Scraper status check error:', err);
        }
    }

    // -------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------
    fetchStats();
    loadPhones();
});

