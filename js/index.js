/*
 * Front-end logic for the wedding budget list page with inline editing.
 *
 * Fetches data from Supabase and provides searching, filtering, sorting,
 * and inline CRUD operations with auto-save. Anyone can edit, add, or delete items.
 */

(() => {
  // Budget configuration
  const BUDGET = 40000;

  // Initialize Supabase client
  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Data storage
  let originalData = [];
  let filteredData = [];
  let currentSort = { key: 'id', asc: true };

  // Track editing state
  let currentEditingRow = null;
  let editingItemBackup = null;

  /**
   * Transform database row (snake_case) to app format (camelCase)
   */
  function transformItem(dbItem) {
    return {
      id: dbItem.id,
      category: dbItem.category,
      item: dbItem.item,
      required: dbItem.required,
      notes: dbItem.notes,
      unitCost: dbItem.unit_cost,
      quantity: dbItem.quantity,
      subTotal: dbItem.sub_total,
      mdContent: dbItem.md_content,
      html: dbItem.html
    };
  }

  /**
   * Transform app format (camelCase) to database format (snake_case)
   */
  function transformToDb(item) {
    return {
      category: item.category,
      item: item.item,
      required: item.required,
      notes: item.notes,
      unit_cost: item.unitCost || null,
      quantity: item.quantity || null,
      sub_total: item.subTotal || null,
      md_content: item.mdContent || null,
      html: null // We don't use pre-rendered HTML anymore
    };
  }

  /**
   * Fetch all budget items from Supabase
   */
  async function fetchAllItems() {
    try {
      const { data, error } = await supabaseClient
        .from('budget_items')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error fetching items:', error);
        showError('Failed to load budget items from database. Please refresh the page.');
        return [];
      }

      return data ? data.map(transformItem) : [];
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('An unexpected error occurred. Please refresh the page.');
      return [];
    }
  }

  /**
   * Create a new item in Supabase
   */
  async function createItem(item) {
    try {
      const { data, error } = await supabaseClient
        .from('budget_items')
        .insert([transformToDb(item)])
        .select();

      if (error) {
        console.error('Error creating item:', error);
        showError('Failed to create item. Please try again.');
        return null;
      }

      return data && data.length > 0 ? transformItem(data[0]) : null;
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('An unexpected error occurred. Please try again.');
      return null;
    }
  }

  /**
   * Update an existing item in Supabase
   */
  async function updateItem(id, updates) {
    try {
      const { data, error} = await supabaseClient
        .from('budget_items')
        .update(transformToDb(updates))
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating item:', error);
        showError('Failed to update item. Please try again.');
        return null;
      }

      return data && data.length > 0 ? transformItem(data[0]) : null;
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('An unexpected error occurred. Please try again.');
      return null;
    }
  }

  /**
   * Update a single field of an item in Supabase
   */
  async function updateItemField(id, field, value) {
    try {
      const updateData = { [field]: value };
      const { data, error } = await supabaseClient
        .from('budget_items')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating field:', error);
        return null;
      }

      return data && data.length > 0 ? transformItem(data[0]) : null;
    } catch (err) {
      console.error('Unexpected error:', err);
      return null;
    }
  }

  /**
   * Delete an item from Supabase
   */
  async function deleteItem(id) {
    try {
      const { error } = await supabaseClient
        .from('budget_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting item:', error);
        showError('Failed to delete item. Please try again.');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Unexpected error:', err);
      showError('An unexpected error occurred. Please try again.');
      return false;
    }
  }

  /**
   * Display an error message to the user
   */
  function showError(message) {
    const main = document.querySelector('main');
    const existingError = main.querySelector('.error-banner');
    if (existingError) {
      existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.style.cssText = 'background: #ffebee; color: #d32f2f; padding: 1rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #ef5350;';
    errorDiv.textContent = message;
    main.insertBefore(errorDiv, main.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => errorDiv.remove(), 5000);
  }

  /**
   * Display a success message to the user
   */
  function showSuccess(message) {
    const main = document.querySelector('main');
    const existingSuccess = main.querySelector('.success-banner');
    if (existingSuccess) {
      existingSuccess.remove();
    }

    const successDiv = document.createElement('div');
    successDiv.className = 'success-banner';
    successDiv.style.cssText = 'background: #e8f5e9; color: #2e7d32; padding: 1rem; border-radius: 8px; margin: 1rem 0; border: 1px solid #4caf50;';
    successDiv.textContent = message;
    main.insertBefore(successDiv, main.firstChild);

    // Auto-remove after 3 seconds
    setTimeout(() => successDiv.remove(), 3000);
  }

  /**
   * Calculate the subtotal for an item
   */
  function calculateSubTotal(item) {
    if (typeof item.subTotal === 'number') {
      return item.subTotal;
    }
    const cost = typeof item.unitCost === 'number' ? item.unitCost : 0;
    const qty = typeof item.quantity === 'number' && item.quantity !== null ? item.quantity : 1;
    return cost * qty;
  }

  /**
   * Enter edit mode for a table row
   */
  function enterEditMode(rowElement, item) {
    // If another row is being edited, exit that first
    if (currentEditingRow && currentEditingRow !== rowElement) {
      exitEditMode(currentEditingRow, false);
    }

    currentEditingRow = rowElement;
    editingItemBackup = { ...item };
    rowElement.classList.add('row-editing');

    // Get all cells
    const cells = rowElement.querySelectorAll('td');

    // Category cell (index 1)
    const categoryCell = cells[1];
    const categoryValue = item.category || '';
    categoryCell.innerHTML = '';
    const categoryInput = document.createElement('input');
    categoryInput.type = 'text';
    categoryInput.value = categoryValue;
    categoryInput.className = 'inline-edit-input';
    categoryInput.setAttribute('list', 'categoryList');
    categoryInput.dataset.field = 'category';
    categoryInput.addEventListener('blur', (e) => handleFieldBlur(e, item));
    categoryInput.addEventListener('keydown', (e) => handleKeyDown(e, rowElement));
    categoryCell.appendChild(categoryInput);

    // Item cell (index 2)
    const itemCell = cells[2];
    const itemValue = item.item || '';
    itemCell.innerHTML = '';
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = itemValue;
    itemInput.className = 'inline-edit-input';
    itemInput.dataset.field = 'item';
    itemInput.addEventListener('blur', (e) => handleFieldBlur(e, item));
    itemInput.addEventListener('keydown', (e) => handleKeyDown(e, rowElement));
    itemCell.appendChild(itemInput);

    // Required cell (index 3)
    const requiredCell = cells[3];
    const requiredValue = item.required || 'No';
    requiredCell.innerHTML = '';
    const requiredSelect = document.createElement('select');
    requiredSelect.className = 'inline-edit-select';
    requiredSelect.dataset.field = 'required';
    const options = ['Yes', 'No', 'Maybe', 'Optional'];
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      option.selected = opt === requiredValue;
      requiredSelect.appendChild(option);
    });
    requiredSelect.addEventListener('blur', (e) => handleFieldBlur(e, item));
    requiredSelect.addEventListener('change', (e) => handleFieldBlur(e, item));
    requiredSelect.addEventListener('keydown', (e) => handleKeyDown(e, rowElement));
    requiredCell.appendChild(requiredSelect);

    // Unit Cost cell (index 4)
    const unitCostCell = cells[4];
    const unitCostValue = item.unitCost !== null && item.unitCost !== undefined ? item.unitCost : '';
    unitCostCell.innerHTML = '';
    const unitCostInput = document.createElement('input');
    unitCostInput.type = 'number';
    unitCostInput.step = '0.01';
    unitCostInput.min = '0';
    unitCostInput.value = unitCostValue;
    unitCostInput.className = 'inline-edit-input';
    unitCostInput.dataset.field = 'unitCost';
    unitCostInput.addEventListener('blur', (e) => handleFieldBlur(e, item));
    unitCostInput.addEventListener('keydown', (e) => handleKeyDown(e, rowElement));
    unitCostCell.appendChild(unitCostInput);

    // Quantity cell (index 5)
    const quantityCell = cells[5];
    const quantityValue = item.quantity !== null && item.quantity !== undefined ? item.quantity : '';
    quantityCell.innerHTML = '';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.step = '0.01';
    quantityInput.min = '0';
    quantityInput.value = quantityValue;
    quantityInput.className = 'inline-edit-input';
    quantityInput.dataset.field = 'quantity';
    quantityInput.addEventListener('blur', (e) => handleFieldBlur(e, item));
    quantityInput.addEventListener('keydown', (e) => handleKeyDown(e, rowElement));
    quantityCell.appendChild(quantityInput);

    // Update actions column (index 7)
    const actionsCell = cells[7];
    actionsCell.innerHTML = '';

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn-success';
    doneBtn.textContent = '✓ Done';
    doneBtn.setAttribute('aria-label', 'Exit edit mode');
    doneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exitEditMode(rowElement, true);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDelete(item.id);
    });

    actionsCell.appendChild(doneBtn);
    actionsCell.appendChild(deleteBtn);
  }

  /**
   * Handle key presses in edit mode
   */
  function handleKeyDown(e, rowElement) {
    if (e.key === 'Escape') {
      exitEditMode(rowElement, false);
    } else if (e.key === 'Enter' && e.target.tagName !== 'SELECT') {
      e.target.blur();
    }
  }

  /**
   * Handle field blur - auto-save changes
   */
  async function handleFieldBlur(e, item) {
    const input = e.target;
    const field = input.dataset.field;
    let newValue = input.value.trim();

    // Convert numeric fields
    if (field === 'unitCost' || field === 'quantity') {
      newValue = newValue === '' ? null : parseFloat(newValue);
    }

    // Check if value actually changed
    const oldValue = item[field];
    if (oldValue === newValue) {
      return; // No change, don't save
    }

    // Show saving state
    const cell = input.parentElement;
    showCellSaving(cell);

    // Check if this is a new item (temp ID)
    const isNewItem = typeof item.id === 'string' && item.id.startsWith('new-item-temp-');

    if (isNewItem) {
      // For new items, we need to create the item first
      // Update the item object locally
      item[field] = newValue;

      // Check if we have minimum required fields (category and item name)
      if (item.category && item.item) {
        // Create the item in the database
        const created = await createItem(item);
        if (created) {
          // Replace temp item with real item in originalData
          const index = originalData.findIndex(i => i.id === item.id);
          if (index !== -1) {
            originalData[index] = created;
          }
          // Update the item reference
          Object.assign(item, created);
          showCellSaved(cell);
          applyFilters();
          renderTable();
        } else {
          showCellError(cell);
        }
      } else {
        // Not enough data to create yet, just update locally
        showCellSaved(cell);
      }
    } else {
      // Existing item - update single field
      const dbFieldName = camelToSnake(field);
      const updated = await updateItemField(item.id, dbFieldName, newValue);

      if (updated) {
        // Update local data
        item[field] = newValue;
        const index = originalData.findIndex(i => i.id === item.id);
        if (index !== -1) {
          originalData[index] = { ...originalData[index], [field]: newValue };
        }
        showCellSaved(cell);
        updateSummary();
      } else {
        // Revert on error
        if (field === 'unitCost' || field === 'quantity') {
          input.value = oldValue !== null && oldValue !== undefined ? oldValue : '';
        } else {
          input.value = oldValue || '';
        }
        showCellError(cell);
        showError(`Failed to update ${field}. Please try again.`);
      }
    }
  }

  /**
   * Convert camelCase to snake_case
   */
  function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Show saving state on a cell
   */
  function showCellSaving(cell) {
    cell.classList.remove('cell-saved', 'cell-error');
    cell.classList.add('cell-saving');
  }

  /**
   * Show saved state on a cell
   */
  function showCellSaved(cell) {
    cell.classList.remove('cell-saving', 'cell-error');
    cell.classList.add('cell-saved');
    setTimeout(() => {
      cell.classList.remove('cell-saved');
    }, 2000);
  }

  /**
   * Show error state on a cell
   */
  function showCellError(cell) {
    cell.classList.remove('cell-saving', 'cell-saved');
    cell.classList.add('cell-error');
    setTimeout(() => {
      cell.classList.remove('cell-error');
    }, 3000);
  }

  /**
   * Exit edit mode for a table row
   */
  function exitEditMode(rowElement, save) {
    if (!rowElement) return;

    rowElement.classList.remove('row-editing');
    currentEditingRow = null;
    editingItemBackup = null;

    // Re-render the entire table to restore normal view
    renderTable();
  }

  /**
   * Add a new blank item row at the top of the table
   */
  function addNewItemRow() {
    // Check if there's already a new item row
    const hasNewItem = originalData.some(item =>
      typeof item.id === 'string' && item.id.startsWith('new-item-temp-')
    );

    if (hasNewItem) {
      showError('Please complete or delete the existing new item first.');
      return;
    }

    // Create a new temporary item
    const newItem = {
      id: `new-item-temp-${Date.now()}`,
      category: '',
      item: '',
      required: 'No',
      notes: '',
      unitCost: null,
      quantity: null,
      subTotal: null,
      mdContent: ''
    };

    // Add to the beginning of originalData
    originalData.unshift(newItem);

    // Reapply filters and render
    applyFilters();
    renderTable();

    // Automatically enter edit mode for the new row
    const tbody = document.querySelector('#dataTable tbody');
    const firstRow = tbody.querySelector('tr');
    if (firstRow) {
      enterEditMode(firstRow, newItem);
      // Focus on the category input
      const categoryInput = firstRow.querySelector('input[data-field="category"]');
      if (categoryInput) {
        categoryInput.focus();
      }
    }
  }

  /**
   * Handle delete button click
   */
  async function handleDelete(id) {
    // Check if this is a temp new item
    const isNewItem = typeof id === 'string' && id.startsWith('new-item-temp-');

    if (isNewItem) {
      // Just remove from local array, no API call needed
      originalData = originalData.filter(item => item.id !== id);
      applyFilters();
      renderTable();
      return;
    }

    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    const success = await deleteItem(id);
    if (success) {
      // Remove from local data
      originalData = originalData.filter(item => item.id !== id);
      applyFilters();
      renderTable();
      showSuccess('Item deleted successfully.');
    }
  }

  /**
   * Populate the category filter select and datalist with unique categories
   */
  function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    const datalist = document.getElementById('categoryList');

    // Clear existing options
    select.innerHTML = '<option value="">All Categories</option>';
    datalist.innerHTML = '';

    const categories = [...new Set(originalData
      .map(item => item.category)
      .filter(cat => cat && typeof cat === 'string' && cat.trim() !== '')
    )].sort();

    categories.forEach(cat => {
      // Add to filter dropdown
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);

      // Add to datalist for autocomplete
      const datalistOption = document.createElement('option');
      datalistOption.value = cat;
      datalist.appendChild(datalistOption);
    });
  }

  /**
   * Handle changes to any filter inputs
   */
  function handleFilterChange() {
    applyFilters();
    renderTable();
  }

  /**
   * Apply the current search, category and required filters
   */
  function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const categoryValue = document.getElementById('categoryFilter').value;
    const requiredOnly = document.getElementById('requiredFilter').checked;
    filteredData = originalData.filter(item => {
      const matchesSearch = !searchTerm ||
        (item.item && item.item.toLowerCase().includes(searchTerm)) ||
        (item.category && item.category.toLowerCase().includes(searchTerm));
      const matchesCategory = !categoryValue || item.category === categoryValue;
      const matchesRequired = !requiredOnly || (item.required && item.required.toLowerCase().startsWith('y'));
      return matchesSearch && matchesCategory && matchesRequired;
    });
  }

  /**
   * Sort the filtered data
   */
  function sortData() {
    const key = currentSort.key;
    const asc = currentSort.asc;
    filteredData.sort((a, b) => {
      let va = a[key];
      let vb = b[key];

      if (key === 'subTotal') {
        va = calculateSubTotal(a);
        vb = calculateSubTotal(b);
      }

      if (va === undefined || va === null) va = '';
      if (vb === undefined || vb === null) vb = '';

      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }

      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return asc ? -1 : 1;
      if (sa > sb) return asc ? 1 : -1;
      return 0;
    });
  }

  /**
   * Render the table body with action buttons
   */
  function renderTable() {
    sortData();
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    if (filteredData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #6e6e73;">No items found matching your filters.</td></tr>';
      updateSummary();
      return;
    }

    filteredData.forEach(item => {
      const tr = document.createElement('tr');
      tr.dataset.itemId = item.id;
      const subTotal = calculateSubTotal(item);

      const tdId = document.createElement('td');
      tdId.textContent = typeof item.id === 'string' && item.id.startsWith('new-item-temp-') ? 'NEW' : item.id;

      const tdCategory = document.createElement('td');
      tdCategory.textContent = item.category || '';

      const tdItem = document.createElement('td');
      tdItem.textContent = item.item || '';

      const tdRequired = document.createElement('td');
      tdRequired.textContent = item.required || '';

      const tdUnitCost = document.createElement('td');
      tdUnitCost.textContent = formatCurrency(item.unitCost);

      const tdQuantity = document.createElement('td');
      tdQuantity.textContent = item.quantity !== null && item.quantity !== undefined ? item.quantity : '1';

      const tdSubTotal = document.createElement('td');
      tdSubTotal.textContent = formatCurrency(subTotal);

      const tdActions = document.createElement('td');
      tdActions.className = 'action-buttons';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-edit';
      editBtn.innerHTML = '&#9998; Edit'; // Pencil icon
      editBtn.setAttribute('aria-label', 'Edit item');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterEditMode(tr, item);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(item.id);
      });

      tdActions.appendChild(editBtn);
      tdActions.appendChild(deleteBtn);

      tr.appendChild(tdId);
      tr.appendChild(tdCategory);
      tr.appendChild(tdItem);
      tr.appendChild(tdRequired);
      tr.appendChild(tdUnitCost);
      tr.appendChild(tdQuantity);
      tr.appendChild(tdSubTotal);
      tr.appendChild(tdActions);

      // Click on row to view details (except actions column and new items)
      const isNewItem = typeof item.id === 'string' && item.id.startsWith('new-item-temp-');
      if (!isNewItem) {
        [tdId, tdCategory, tdItem, tdRequired, tdUnitCost, tdQuantity, tdSubTotal].forEach(td => {
          td.addEventListener('click', (e) => {
            // Don't navigate if row is in edit mode
            if (tr.classList.contains('row-editing')) {
              return;
            }
            window.location.href = `item.html?id=${item.id}`;
          });
          td.style.cursor = 'pointer';
        });
      }

      tbody.appendChild(tr);
    });
    updateSummary();
  }

  /**
   * Update sort indicators on table headers
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
   * Update the summary counts and totals display
   */
  function updateSummary() {
    // Filter out temp new items for counts
    const realOriginalData = originalData.filter(item =>
      !(typeof item.id === 'string' && item.id.startsWith('new-item-temp-'))
    );
    const realFilteredData = filteredData.filter(item =>
      !(typeof item.id === 'string' && item.id.startsWith('new-item-temp-'))
    );

    document.getElementById('totalCount').textContent = realOriginalData.length;
    document.getElementById('visibleCount').textContent = realFilteredData.length;
    const total = filteredData.reduce((sum, item) => sum + calculateSubTotal(item), 0);
    document.getElementById('totalCost').textContent = formatCurrency(total, true);
    updateMetrics();
  }

  /**
   * Update the budget metric cards
   */
  function updateMetrics() {
    // Only include real items (not temp new items) in metrics
    const realItems = originalData.filter(item =>
      !(typeof item.id === 'string' && item.id.startsWith('new-item-temp-'))
    );
    const totalCost = realItems.reduce((sum, item) => sum + calculateSubTotal(item), 0);
    const remaining = BUDGET - totalCost;
    const percentage = BUDGET > 0 ? (totalCost / BUDGET) * 100 : 0;

    document.getElementById('metricTotalCost').textContent = `$${formatCurrency(totalCost, true)}`;
    document.getElementById('metricBudget').textContent = `$${formatCurrency(BUDGET, true)}`;
    document.getElementById('metricRemaining').textContent = `$${formatCurrency(Math.abs(remaining), true)}`;
    document.getElementById('metricPercentage').textContent = `${percentage.toFixed(1)}%`;

    const progressBar = document.getElementById('metricProgressBar');
    progressBar.style.width = `${Math.min(percentage, 100)}%`;

    const percentageElement = document.getElementById('metricPercentage');
    const remainingElement = document.getElementById('metricRemaining');

    percentageElement.classList.remove('status-good', 'status-warning', 'status-danger');
    remainingElement.classList.remove('status-good', 'status-warning', 'status-danger');
    progressBar.classList.remove('status-good', 'status-warning', 'status-danger');

    if (remaining < 0) {
      percentageElement.classList.add('status-danger');
      remainingElement.classList.add('status-danger');
      progressBar.classList.add('status-danger');
      remainingElement.textContent = `-$${formatCurrency(Math.abs(remaining), true)}`;
    } else if (percentage >= 90) {
      percentageElement.classList.add('status-warning');
      remainingElement.classList.add('status-warning');
      progressBar.classList.add('status-warning');
    } else {
      percentageElement.classList.add('status-good');
      remainingElement.classList.add('status-good');
      progressBar.classList.add('status-good');
    }
  }

  /**
   * Format a number into US currency
   */
  function formatCurrency(value, raw = false) {
    if (typeof value !== 'number' || isNaN(value)) return '';
    const formatted = value.toFixed(2);
    return raw ? formatted : `$${formatted}`;
  }

  /**
   * Initialize the page once the DOM is ready
   */
  async function init() {
    // Show loading state
    document.querySelector('#dataTable tbody').innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Loading data from database...</td></tr>';

    // Fetch data from Supabase
    originalData = await fetchAllItems();
    filteredData = [...originalData];

    // Set up event listeners
    populateCategoryFilter();
    document.getElementById('searchInput').addEventListener('input', handleFilterChange);
    document.getElementById('categoryFilter').addEventListener('change', handleFilterChange);
    document.getElementById('requiredFilter').addEventListener('change', handleFilterChange);
    document.getElementById('addItemBtn').addEventListener('click', addNewItemRow);

    // Attach sort handlers to all header cells with data-sort
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.getAttribute('data-sort');
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

  // Initialize when DOM is loaded
  window.addEventListener('DOMContentLoaded', init);
})();
