/*
 * Front-end logic for the individual item details page with markdown editing.
 *
 * Fetches a single item from Supabase based on the `id` query parameter,
 * renders its markdown content using the marked library, and provides
 * inline markdown editing with live preview.
 */

(() => {
  // Initialize Supabase client
  const { createClient } = supabase;
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // UI elements - View mode
  let viewMode;
  let editMode;
  let itemTitle;
  let categoryBadge;
  let requiredBadge;
  let metaUnitCost;
  let metaQuantity;
  let metaSubtotal;
  let metaTimestamps;
  let tableOfContents;
  let tocList;
  let mdContentEl;

  // UI elements - Edit mode
  let markdownEditor;
  let mdTextarea;
  let livePreview;

  // Buttons
  let editBtn;
  let printBtn;
  let saveBtn;
  let cancelBtn;

  // Current item data
  let currentItem = null;
  let originalMarkdown = '';

  // Debounce timer for live preview
  let previewDebounceTimer = null;

  // Active section tracking for TOC
  let activeSectionObserver = null;

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
      html: dbItem.html,
      created_at: dbItem.created_at,
      updated_at: dbItem.updated_at
    };
  }

  /**
   * Fetch a single budget item from Supabase by ID
   */
  async function fetchItem(id) {
    try {
      const { data, error } = await supabaseClient
        .from('budget_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching item:', error);
        return null;
      }

      return transformItem(data);
    } catch (err) {
      console.error('Unexpected error:', err);
      return null;
    }
  }

  /**
   * Update markdown content for an item in Supabase
   */
  async function updateMarkdownContent(id, mdContent) {
    try {
      const { data, error } = await supabaseClient
        .from('budget_items')
        .update({ md_content: mdContent })
        .eq('id', id)
        .select();

      if (error) {
        console.error('Error updating markdown:', error);
        showError('Failed to save markdown content. Please try again.');
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
   * Render markdown content to HTML
   */
  function renderMarkdown(mdContent) {
    if (!mdContent || mdContent.trim() === '') {
      return '<p style="color: #6e6e73; font-style: italic;">No additional information provided.</p>';
    }

    if (typeof marked === 'object' && typeof marked.parse === 'function') {
      // Configure marked to treat single line breaks as <br> (GitHub Flavored Markdown)
      return marked.parse(mdContent, {
        breaks: true,  // Enable line breaks (single newline = <br>)
        gfm: true      // GitHub Flavored Markdown
      });
    } else {
      // Fallback if marked.js not loaded
      return `<pre>${escapeHtml(mdContent)}</pre>`;
    }
  }

  /**
   * Basic HTML escape to avoid XSS issues
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

  /**
   * Format currency value
   */
  function formatCurrency(value) {
    if (value === null || value === undefined) return '—';
    return `$${parseFloat(value).toFixed(2)}`;
  }

  /**
   * Format date string
   */
  function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Populate item metadata UI
   */
  function populateMetadata(item) {
    // Update hero section
    itemTitle.textContent = item.item || 'Untitled Item';
    document.getElementById('pageTitle').textContent = item.item || 'Item Details';

    // Category badge
    if (item.category) {
      categoryBadge.textContent = item.category;
      categoryBadge.style.display = 'inline-block';
    } else {
      categoryBadge.style.display = 'none';
    }

    // Required badge
    const isRequired = item.required && item.required.toLowerCase() === 'yes';
    requiredBadge.textContent = isRequired ? 'Required' : 'Optional';
    requiredBadge.className = isRequired
      ? 'badge badge-required'
      : 'badge badge-required not-required';

    // Metadata values
    metaUnitCost.textContent = formatCurrency(item.unitCost);
    metaQuantity.textContent = item.quantity || '1';
    metaSubtotal.textContent = formatCurrency(item.subTotal);

    // Timestamps
    const createdText = item.created_at ? `Created: ${formatDate(item.created_at)}` : '';
    const updatedText = item.updated_at ? `Updated: ${formatDate(item.updated_at)}` : '';
    const timestampText = [createdText, updatedText].filter(Boolean).join(' • ');
    metaTimestamps.textContent = timestampText;
  }

  /**
   * Generate table of contents from markdown headings
   */
  function generateTableOfContents() {
    const headings = mdContentEl.querySelectorAll('h2, h3');

    // Only show TOC if there are 3 or more headings
    if (headings.length < 3) {
      tableOfContents.style.display = 'none';
      return;
    }

    // Clear existing TOC
    tocList.innerHTML = '';

    let currentH2Item = null;
    let h2Index = 0;

    headings.forEach((heading, index) => {
      // Generate unique ID for heading if it doesn't have one
      if (!heading.id) {
        const headingText = heading.textContent.trim();
        const id = headingText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        heading.id = id || `heading-${index}`;
      }

      // Create TOC link
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update URL hash without jumping
        history.pushState(null, null, `#${heading.id}`);
      });

      if (heading.tagName === 'H2') {
        // Create top-level list item
        h2Index++;
        const li = document.createElement('li');
        li.appendChild(link);
        tocList.appendChild(li);
        currentH2Item = li;
      } else if (heading.tagName === 'H3' && currentH2Item) {
        // Create nested list for H3 under current H2
        let nestedList = currentH2Item.querySelector('ul');
        if (!nestedList) {
          nestedList = document.createElement('ul');
          currentH2Item.appendChild(nestedList);
        }
        const li = document.createElement('li');
        li.appendChild(link);
        nestedList.appendChild(li);
      }
    });

    // Show TOC
    tableOfContents.style.display = 'block';

    // Set up intersection observer for active section highlighting
    setupActiveSectionObserver();
  }

  /**
   * Set up intersection observer to highlight active section in TOC
   */
  function setupActiveSectionObserver() {
    // Clean up previous observer if it exists
    if (activeSectionObserver) {
      activeSectionObserver.disconnect();
    }

    const headings = mdContentEl.querySelectorAll('h2, h3');
    if (headings.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    activeSectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // Remove active class from all TOC links
          tocList.querySelectorAll('a').forEach(link => link.classList.remove('active'));

          // Add active class to current section's TOC link
          const activeLink = tocList.querySelector(`a[href="#${entry.target.id}"]`);
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });
    }, observerOptions);

    headings.forEach(heading => {
      if (heading.id) {
        activeSectionObserver.observe(heading);
      }
    });
  }

  /**
   * Handle print button click
   */
  function handlePrint() {
    window.print();
  }

  /**
   * Enter markdown edit mode
   */
  function enterEditMode() {
    // Store original markdown for cancel
    originalMarkdown = currentItem.mdContent || '';

    // Hide view mode
    viewMode.style.display = 'none';

    // Show edit mode
    editMode.style.display = 'block';

    // Populate textarea with current markdown
    mdTextarea.value = originalMarkdown;

    // Update live preview
    updateLivePreview();

    // Update button visibility
    editBtn.style.display = 'none';
    printBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';

    // Focus textarea at the end
    mdTextarea.focus();
    mdTextarea.setSelectionRange(mdTextarea.value.length, mdTextarea.value.length);
  }

  /**
   * Exit markdown edit mode
   */
  function exitEditMode(save = false) {
    // Hide edit mode
    editMode.style.display = 'none';

    // Show view mode
    viewMode.style.display = 'block';

    // Update button visibility
    editBtn.style.display = 'inline-block';
    printBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  }

  /**
   * Update the live preview with debouncing
   */
  function updateLivePreview() {
    const markdown = mdTextarea.value;
    livePreview.innerHTML = renderMarkdown(markdown);
  }

  /**
   * Update live preview with debouncing
   */
  function handleTextareaInput() {
    // Clear existing timer
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }

    // Set new timer to update preview after 300ms
    previewDebounceTimer = setTimeout(() => {
      updateLivePreview();
    }, 300);
  }

  /**
   * Save markdown changes
   */
  async function saveMarkdownChanges() {
    const newMarkdown = mdTextarea.value;

    // Check if content actually changed
    if (newMarkdown === originalMarkdown) {
      exitEditMode(true);
      return;
    }

    // Disable buttons while saving
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    // Update in Supabase
    const updated = await updateMarkdownContent(currentItem.id, newMarkdown);

    if (updated) {
      // Update current item
      currentItem.mdContent = newMarkdown;

      // Re-render the markdown content view
      mdContentEl.innerHTML = renderMarkdown(newMarkdown);

      // Regenerate table of contents
      generateTableOfContents();

      // Exit edit mode
      exitEditMode(true);

      // Show success message
      showSuccess('Markdown content saved successfully!');

      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    } else {
      // Re-enable button on error
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }

  /**
   * Cancel editing
   */
  function cancelEditing() {
    const currentMarkdown = mdTextarea.value;

    // Check if there are unsaved changes
    if (currentMarkdown !== originalMarkdown) {
      const confirmCancel = confirm('You have unsaved changes. Are you sure you want to cancel?');
      if (!confirmCancel) {
        return; // Don't cancel
      }
    }

    // Revert textarea to original
    mdTextarea.value = originalMarkdown;

    // Exit edit mode
    exitEditMode(false);
  }

  /**
   * Handle ESC key press
   */
  function handleKeyDown(e) {
    if (e.key === 'Escape' && markdownEditor.style.display === 'block') {
      cancelEditing();
    }
  }

  async function init() {
    // Get UI elements - View mode
    viewMode = document.getElementById('viewMode');
    editMode = document.getElementById('editMode');
    itemTitle = document.getElementById('itemTitle');
    categoryBadge = document.getElementById('categoryBadge');
    requiredBadge = document.getElementById('requiredBadge');
    metaUnitCost = document.getElementById('metaUnitCost');
    metaQuantity = document.getElementById('metaQuantity');
    metaSubtotal = document.getElementById('metaSubtotal');
    metaTimestamps = document.getElementById('metaTimestamps');
    tableOfContents = document.getElementById('tableOfContents');
    tocList = document.getElementById('tocList');
    mdContentEl = document.getElementById('markdownContent');

    // Get UI elements - Edit mode
    mdTextarea = document.getElementById('mdTextarea');
    livePreview = document.getElementById('livePreview');

    // Get buttons
    editBtn = document.getElementById('editBtn');
    printBtn = document.getElementById('printBtn');
    saveBtn = document.getElementById('saveBtn');
    cancelBtn = document.getElementById('cancelBtn');

    // Show loading state
    mdContentEl.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6e6e73;">Loading item details from database...</p>';

    const idParam = getQueryParam('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;

    if (isNaN(id)) {
      showError('Invalid item ID provided.');
      mdContentEl.innerHTML = '';
      return;
    }

    const item = await fetchItem(id);

    if (!item) {
      showError('Item not found in database.');
      mdContentEl.innerHTML = '';
      return;
    }

    currentItem = item;

    // Populate all metadata
    populateMetadata(item);

    // Render markdown content
    mdContentEl.innerHTML = renderMarkdown(item.mdContent);

    // Generate table of contents
    generateTableOfContents();

    // Show action buttons
    editBtn.style.display = 'inline-block';
    printBtn.style.display = 'inline-block';

    // Set up event listeners
    editBtn.addEventListener('click', enterEditMode);
    printBtn.addEventListener('click', handlePrint);
    saveBtn.addEventListener('click', saveMarkdownChanges);
    cancelBtn.addEventListener('click', cancelEditing);
    mdTextarea.addEventListener('input', handleTextareaInput);
    document.addEventListener('keydown', handleKeyDown);
  }

  window.addEventListener('DOMContentLoaded', init);
})();
