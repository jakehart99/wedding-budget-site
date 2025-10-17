/*
 * Front-end logic for the individual item details page.
 *
 * Parses the query string for an `id` parameter, looks up the
 * corresponding entry in the global `DATA` array, and populates
 * the page with its data. Markdown content from the source file
 * is converted to HTML using the marked library.
 */

(() => {
  /**
   * Extract the value of a query parameter from the current URL.
   *
   * @param {string} param The parameter name
   * @returns {string|null} Value or null if absent
   */
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  /**
   * Format a number into US currency. Null or undefined values yield an empty string.
   *
   * @param {number|null|undefined} value
   */
  function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    return `$${value.toFixed(2)}`;
  }

  function init() {
    const idParam = getQueryParam('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    const item = Array.isArray(DATA) ? DATA.find(r => r.id === id) : null;
    if (!item) {
      document.querySelector('main').innerHTML = `<p>Item not found.</p>`;
      return;
    }
    // Populate text fields
    document.querySelector('header h1').textContent = item.item || 'Item Details';
    document.getElementById('category').textContent = item.category || '';
    document.getElementById('required').textContent = item.required || '';
    document.getElementById('notes').textContent = item.notes || '';
    document.getElementById('unitCost').textContent = formatCurrency(item.unitCost);
    document.getElementById('quantity').textContent = item.quantity !== null && item.quantity !== undefined ? item.quantity : '';
    document.getElementById('subTotal').textContent = formatCurrency(item.subTotal);
    // Render markdown content using the marked library if available.
    // We prefer parsing markdown at runtime via the open‑source marked
    // parser to avoid using a home‑made solution. If mdContent is
    // provided, convert it to HTML; otherwise fall back to pre‑converted
    // HTML from the dataset or a placeholder message.
    const mdContentEl = document.getElementById('markdownContent');
    if (item.mdContent && typeof marked === 'function') {
      // Convert markdown to HTML via marked
      mdContentEl.innerHTML = marked.parse(item.mdContent);
    } else if (item.html) {
      mdContentEl.innerHTML = item.html;
    } else {
      mdContentEl.innerHTML = '<p>No additional information provided.</p>';
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();