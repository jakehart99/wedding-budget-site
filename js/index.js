/*
 * Front-end logic for the wedding budget list page.
 *
 * Provides searching, filtering, sorting and navigation to detailed
 * pages. The data is loaded from the global `DATA` array defined in
 * data.js. We avoid any external dependencies, keeping the bundle
 * lightweight and suitable for static hosting platforms like Vercel.
 */

(() => {
  // Clone the original data so we don't mutate the global constant
  const originalData = Array.isArray(DATA) ? [...DATA] : [];
  let filteredData = [...originalData];
  let currentSort = { key: 'id', asc: true };

  /**
   * Initialise the page once the DOM is ready.
   */
  function init() {
    populateCategoryFilter();
    document.getElementById('searchInput').addEventListener('input', handleFilterChange);
    document.getElementById('categoryFilter').addEventListener('change', handleFilterChange);
    document.getElementById('requiredFilter').addEventListener('change', handleFilterChange);
    // Attach sort handlers to all header cells with data-sort
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
        // Toggle sort direction when clicking the same header
        if (currentSort.key === key) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort = { key, asc: true };
        }
        renderTable();
        updateSortIndicators();
      });
    });
    renderTable();
    updateSortIndicators();
  }

  /**
   * Populate the category filter select with unique categories from the data.
   */
  function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const categories = [...new Set(originalData.map(item => item.category).filter(Boolean))].sort();
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }

  /**
   * Handle changes to any filter inputs and trigger a table re-render.
   */
  function handleFilterChange() {
    applyFilters();
    renderTable();
  }

  /**
   * Apply the current search, category and required filters to the data set.
   */
  function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const categoryValue = document.getElementById('categoryFilter').value;
    const requiredOnly = document.getElementById('requiredFilter').checked;
    filteredData = originalData.filter(item => {
      // Search by item or category text
      const matchesSearch = !searchTerm ||
        (item.item && item.item.toLowerCase().includes(searchTerm)) ||
        (item.category && item.category.toLowerCase().includes(searchTerm));
      const matchesCategory = !categoryValue || item.category === categoryValue;
      const matchesRequired = !requiredOnly || (item.required && item.required.toLowerCase().startsWith('y'));
      return matchesSearch && matchesCategory && matchesRequired;
    });
  }

  /**
   * Sort the filtered data based on the current sort settings.
   */
  function sortData() {
    const key = currentSort.key;
    const asc = currentSort.asc;
    filteredData.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      // Normalise undefined/null values
      if (va === undefined || va === null) va = '';
      if (vb === undefined || vb === null) vb = '';
      // Numeric sort if both are numbers
      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }
      // Otherwise convert to string and compare lexicographically
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return asc ? -1 : 1;
      if (sa > sb) return asc ? 1 : -1;
      return 0;
    });
  }

  /**
   * Render the table body with the current filtered and sorted data.
   */
  function renderTable() {
    sortData();
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    filteredData.forEach(item => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-id', item.id);
      tr.innerHTML = `
        <td>${item.id}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${escapeHtml(item.item)}</td>
        <td>${escapeHtml(item.required)}</td>
        <td>${formatCurrency(item.unitCost)}</td>
        <td>${item.quantity !== null && item.quantity !== undefined ? item.quantity : ''}</td>
        <td>${formatCurrency(item.subTotal)}</td>
      `;
      tr.addEventListener('click', () => {
        window.location.href = `item.html?id=${item.id}`;
      });
      tbody.appendChild(tr);
    });
    updateSummary();
  }

  /**
   * Update sort indicators (arrow icons) on table headers.
   */
  function updateSortIndicators() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      const key = th.getAttribute('data-sort');
      if (currentSort.key === key) {
        th.classList.add(currentSort.asc ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  /**
   * Update the summary counts and totals display.
   */
  function updateSummary() {
    document.getElementById('totalCount').textContent = originalData.length;
    document.getElementById('visibleCount').textContent = filteredData.length;
    // Compute total estimated cost from subTotals, ignoring nulls
    const total = filteredData.reduce((sum, item) => sum + (typeof item.subTotal === 'number' ? item.subTotal : 0), 0);
    document.getElementById('totalCost').textContent = formatCurrency(total, true);
  }

  /**
   * Format a number into US currency with two decimal places. If the
   * value is not a number, return an empty string to avoid clutter.
   *
   * @param {number|null|undefined} value
   * @param {boolean} raw return raw numeric string (without symbol)
   */
  function formatCurrency(value, raw = false) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const formatted = value.toFixed(2);
    return raw ? formatted : `$${formatted}`;
  }

  /**
   * Basic HTML escape to avoid XSS issues when injecting cell text.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initialise when DOM is loaded
  window.addEventListener('DOMContentLoaded', init);
})();