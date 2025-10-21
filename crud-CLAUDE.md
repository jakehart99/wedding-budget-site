# CRUD Operations Guide

This document describes the improved inline CRUD (Create, Read, Update, Delete) system for the Wedding Budget Planner. The system emphasizes direct, intuitive editing with instant auto-save functionality.

## Design Philosophy

The CRUD system is built on these core principles:

1. **Direct Manipulation**: Click to edit directly in place, no modal dialogs required
2. **Instant Feedback**: Auto-save on blur with visual confirmation (saving → saved → fade)
3. **Minimal Friction**: Reduce clicks and context switching for common operations
4. **Forgiveness**: ESC key cancels edits, clear error messages guide recovery
5. **Progressive Enhancement**: Works without JavaScript for basic content viewing

## List Page CRUD (index.html + js/index.js)

### Reading Data

**Initial Load:**
- Page loads and displays "Loading data from database..." in table
- `fetchAllItems()` retrieves all budget items from Supabase `budget_items` table
- Data transformed from snake_case (database) to camelCase (application) via `transformItem()`
- Table renders with all items, budget metrics update automatically

**Data Flow:**
```
Page Load → fetchAllItems() → Supabase SELECT → transformItem() → originalData → renderTable()
```

### Inline Editing (Update)

**Entering Edit Mode:**
1. Each table row has a pencil icon button in the Actions column
2. Click pencil icon to enter edit mode for that specific row
3. Row cells transform into editable inputs while preserving layout:
   - **Category**: `<input type="text">` with `<datalist>` for autocomplete from existing categories
   - **Item**: `<input type="text">`
   - **Required**: `<select>` with options: Yes, No, Maybe, Optional
   - **Unit Cost**: `<input type="number" step="0.01" min="0">`
   - **Quantity**: `<input type="number" step="0.01" min="0">`
4. Edit icon changes to a checkmark icon (visual indicator of edit mode)
5. Row gains `.row-editing` CSS class for visual distinction

**Auto-Save on Blur:**
1. When user clicks away from an input (blur event), changes auto-save
2. Cell shows saving state: subtle spinner animation
3. `updateItem(id, { fieldName: newValue })` called with single field update
4. Supabase PATCH request updates specific field
5. On success:
   - Cell shows green checkmark briefly (500ms)
   - Local `originalData` array updated with new value
   - Budget metrics recalculate automatically
   - Checkmark fades out, cell returns to normal
6. On error:
   - Cell shows red border with error icon
   - Error message appears below table: "Failed to update [field]. Please try again."
   - Input value reverts to previous value
   - Error auto-dismisses after 5 seconds

**Canceling Edits:**
- Press `ESC` key to exit edit mode without saving pending changes
- Row reverts to display mode with original values
- Any unsaved changes in current field are discarded

**Exiting Edit Mode:**
- Click the checkmark icon (was pencil) to exit edit mode
- All changes already saved via blur events
- Row returns to normal display state

**Field-Specific Behaviors:**

*Category Field:*
```javascript
<input type="text" list="categoryList" value="Venue" />
<datalist id="categoryList">
  <option value="Venue">
  <option value="Catering">
  <!-- populated from existing unique categories -->
</datalist>
```
- Autocomplete suggests existing categories
- Can enter new category freely

*Required Field:*
```javascript
<select>
  <option value="Yes">Yes</option>
  <option value="No">No</option>
  <option value="Maybe">Maybe</option>
  <option value="Optional">Optional</option>
</select>
```
- Dropdown prevents invalid values
- Change event triggers immediate save

*Cost/Quantity Fields:*
- Number inputs validate numeric values
- Step="0.01" allows decimal precision
- Min="0" prevents negative values
- On blur: auto-calculate subtotal if needed
- Invalid input shows browser validation message

**Visual States:**

| State | Visual Indicator | Duration |
|-------|------------------|----------|
| Normal | Plain text in cell | Persistent |
| Editing | Input with border, cursor | Until blur or ESC |
| Saving | Subtle spinner in cell | 200ms - 2s |
| Saved | Green checkmark | 500ms fade |
| Error | Red border, error icon | Until next edit or 5s |

### Creating New Items

**Workflow:**
1. Click "+ Add New Item" button at top of table
2. New blank row inserted at top of table (position 0)
3. Row immediately enters edit mode with empty inputs
4. Row has temporary ID: `new-item-temp-{timestamp}`
5. Fill in fields (category and item name are required)
6. **First field save creates the database record:**
   - When first field blurs, `createItem()` called
   - Supabase INSERT returns new item with real ID
   - Temporary row replaced with real database row
   - Subsequent field edits use normal update flow
7. Can click Delete button to remove the new row before saving

**Edge Cases:**
- If user clicks "+ Add New Item" while another new item row exists:
  - Alert: "Please complete or delete the existing new item first"
  - Focus returns to existing new row
- If Supabase create fails:
  - Error message: "Failed to create item. Please try again."
  - Row remains with temp ID for retry
  - User can edit fields and retry or delete row

**Empty Row Template:**
```javascript
{
  id: 'new-item-temp-{timestamp}',
  category: '',
  item: '',
  required: 'No',
  notes: '',
  unitCost: null,
  quantity: null,
  subTotal: null,
  mdContent: ''
}
```

### Deleting Items

**Workflow:**
1. Click red "Delete" button in Actions column
2. Browser confirmation dialog: "Are you sure you want to delete this item? This action cannot be undone."
3. If user confirms:
   - `deleteItem(id)` called
   - Supabase DELETE request by ID
   - On success:
     - Row fades out with CSS transition (300ms)
     - Item removed from `originalData` array
     - Table re-renders without the item
     - Budget metrics recalculate
   - On error:
     - Error message: "Failed to delete item. Please try again."
     - Row remains in table
4. If user cancels, no action taken

**Undo Delete:**
- No undo functionality (may add in future with soft deletes)
- Confirmation dialog is primary protection against accidental deletion

### Navigation to Detail View

**Behavior:**
- Click anywhere on table row (except Actions column) to view markdown details
- Navigates to `item.html?id={itemId}`
- Edit icon and Delete button do NOT trigger navigation (stopPropagation)
- Cursor changes to pointer on hoverable cells to indicate clickability

## Detail Page CRUD (item.html + js/item.js)

### Reading Markdown Content

**Initial Load:**
1. Extract `id` from URL query parameter: `item.html?id=42`
2. `fetchItem(id)` retrieves single item from Supabase
3. Item transformed from snake_case to camelCase
4. Page title (`<h1>`) set to item name
5. Markdown content rendered using marked.js library:
   - If `mdContent` exists: `marked.parse(mdContent)` renders to HTML
   - Fallback to `html` field if pre-rendered HTML available
   - Fallback to "No additional information provided" if neither exists
6. Rendered HTML injected into `<article id="markdownContent">` container

### Editing Markdown Content

**Entering Edit Mode:**
1. Page displays "Edit" button in header next to item title
2. Click "Edit" button to enter markdown editing mode
3. UI changes:
   - Rendered markdown content hidden
   - Markdown editor section revealed with:
     - `<textarea>` populated with raw markdown source (`item.mdContent`)
     - Optional: Live preview pane showing rendered markdown
   - "Edit" button hidden
   - "Save" and "Cancel" buttons appear
4. Textarea auto-focuses with cursor at end

**Markdown Editor Interface:**

```html
<div id="markdownEditor" class="markdown-editor" style="display: none;">
  <div class="editor-toolbar">
    <h3>Edit Markdown Content</h3>
    <div class="editor-actions">
      <button id="cancelEditBtn" class="btn-secondary">Cancel</button>
      <button id="saveMarkdownBtn" class="btn-primary">Save</button>
    </div>
  </div>
  <div class="editor-layout">
    <div class="editor-pane">
      <label for="mdTextarea">Markdown Source</label>
      <textarea id="mdTextarea" rows="20"></textarea>
      <small>Use Markdown formatting: **bold**, *italic*, [links](url), etc.</small>
    </div>
    <div class="preview-pane">
      <label>Live Preview</label>
      <article class="markdown-content" id="livePreview"></article>
    </div>
  </div>
</div>
```

**Live Preview (Optional Enhancement):**
- As user types in textarea, preview updates in real-time
- Debounced by 300ms to avoid excessive re-rendering
- Uses marked.js to parse markdown to HTML
- Styles match main rendered content for WYSIWYG feel

**Saving Changes:**
1. Click "Save" button
2. Button shows loading state: "Saving..."
3. `updateItem(id, { mdContent: newMarkdown })` called
4. Supabase UPDATE with new markdown content
5. On success:
   - Hide editor section
   - Show rendered content section
   - Re-render markdown with updated content
   - Show success message (brief): "Markdown updated successfully"
   - "Save" and "Cancel" buttons hidden
   - "Edit" button reappears
6. On error:
   - Error message below editor: "Failed to save markdown. Please try again."
   - Editor remains open with user's changes
   - User can retry or cancel

**Canceling Edits:**
1. Click "Cancel" button or press `ESC` key
2. Confirmation if changes detected: "Discard unsaved changes?"
3. If confirmed:
   - Hide editor section
   - Show original rendered content
   - "Save" and "Cancel" buttons hidden
   - "Edit" button reappears
4. If no changes detected, cancel immediately without confirmation

**Visual States:**

| State | Edit Button | Save/Cancel Buttons | Content Display |
|-------|-------------|---------------------|-----------------|
| View Mode | Visible | Hidden | Rendered markdown visible |
| Edit Mode | Hidden | Visible | Editor textarea visible |
| Saving | Hidden | Save disabled, loading | Editor visible |
| Error | Hidden | Enabled | Editor visible, error message |

### Detail Page Enhancements

**Additional Actions (Future):**
- "Back to List" link always visible at top
- Breadcrumb: `Home > Budget Items > {Item Name}`
- Print button to print just this item's details
- Share button to copy link to clipboard

## Code Organization

### File Structure

```
final_site/
├── crud-CLAUDE.md           # This file - CRUD documentation
├── CLAUDE.md                # Main project docs (references this file)
├── index.html               # List view with inline editing (no modal)
├── item.html                # Detail view with markdown editor
├── js/
│   ├── index.js             # List page logic with inline CRUD (~650 lines)
│   └── item.js              # Detail page logic with markdown editing (~180 lines)
└── css/
    └── style.css            # Includes inline editing and editor styles
```

### Key Functions (js/index.js)

**Data Layer:**
- `fetchAllItems()`: SELECT all from Supabase, returns array
- `createItem(item)`: INSERT new item, returns created item with ID
- `updateItem(id, updates)`: PATCH single item by ID, returns updated item
- `deleteItem(id)`: DELETE item by ID, returns boolean success

**Inline Editing:**
- `enterEditMode(rowElement, item)`: Converts row cells to inputs
- `exitEditMode(rowElement, item)`: Converts inputs back to text cells
- `handleCellBlur(cell, item, field, inputElement)`: Auto-save on blur
- `saveFieldChange(id, field, value)`: Update single field in Supabase
- `showCellSaving(cell)`: Visual feedback - spinner
- `showCellSaved(cell)`: Visual feedback - green checkmark
- `showCellError(cell, message)`: Visual feedback - red border, error

**Creating Items:**
- `addNewItemRow()`: Inserts blank editable row at top
- `createItemFromRow(rowElement, itemData)`: Converts temp row to real item
- `removeNewItemRow(rowElement)`: Deletes temporary new row

**Rendering:**
- `renderTable()`: Renders all rows from filteredData
- `renderRow(item)`: Renders single row (used for updates)
- `updateSummary()`: Updates counts and totals
- `updateMetrics()`: Updates budget metric cards

**Utilities:**
- `transformItem(dbItem)`: snake_case → camelCase
- `transformToDb(item)`: camelCase → snake_case
- `escapeHtml(str)`: XSS protection
- `formatCurrency(value)`: Format numbers as USD

### Key Functions (js/item.js)

**Data Layer:**
- `fetchItem(id)`: SELECT single item by ID from Supabase
- `updateMarkdownContent(id, mdContent)`: Update markdown field only

**Markdown Editing:**
- `enterMarkdownEditMode()`: Show editor, hide rendered content
- `exitMarkdownEditMode()`: Show rendered content, hide editor
- `saveMarkdownContent()`: Save markdown to Supabase, re-render
- `cancelMarkdownEdit()`: Discard changes, exit edit mode
- `updateLivePreview()`: Debounced markdown preview update

**Rendering:**
- `renderMarkdown(mdContent)`: Parse markdown to HTML via marked.js
- `showError(message)`: Display user-facing error message

## Error Handling Patterns

### Supabase API Errors

All async Supabase operations follow this pattern:

```javascript
async function operation(params) {
  try {
    const { data, error } = await supabaseClient
      .from('budget_items')
      .operation();

    if (error) {
      console.error('Supabase error:', error);
      showError('User-friendly message explaining what failed');
      return null; // or false for boolean operations
    }

    return transformedData;
  } catch (err) {
    console.error('Unexpected error:', err);
    showError('An unexpected error occurred. Please refresh and try again.');
    return null;
  }
}
```

### User-Facing Error Messages

**CREATE errors:**
- "Failed to create item. Please check your input and try again."
- "Database connection error. Please check your internet connection."

**READ errors:**
- "Failed to load budget items from database. Please refresh the page."
- "Item not found. It may have been deleted."

**UPDATE errors:**
- "Failed to update [field name]. Your changes were not saved."
- "Could not save changes. Please try again or refresh the page."

**DELETE errors:**
- "Failed to delete item. Please try again."
- "Item may have already been deleted. Refreshing page..."

### Error Recovery

1. **Retry**: User can retry operation (edit field again, click save again)
2. **Revert**: On failed save, input value reverts to last known good value
3. **Refresh**: If errors persist, user can refresh page to reset state
4. **Fallback**: Degraded functionality when offline (read-only mode)

## Visual Feedback System

### Saving States

**Cell-level feedback for inline edits:**

1. **Editing**: Input has focus, border highlighted
   ```css
   .cell-editing input {
     border: 2px solid var(--color-primary);
     box-shadow: 0 0 0 3px rgba(106, 143, 161, 0.1);
   }
   ```

2. **Saving**: Subtle spinner animation
   ```css
   .cell-saving::after {
     content: '⏳';
     animation: spin 1s linear infinite;
   }
   ```

3. **Saved**: Green checkmark, fades after 500ms
   ```css
   .cell-saved::after {
     content: '✓';
     color: var(--color-success);
     animation: fadeOut 500ms;
   }
   ```

4. **Error**: Red border, error icon
   ```css
   .cell-error input {
     border-color: var(--color-danger);
     background: #ffebee;
   }
   ```

### Page-level Feedback

**Banner messages** appear at top of `<main>` for 5 seconds:
- Success: Green background, checkmark icon
- Error: Red background, error icon
- Info: Blue background, info icon

**Modal loading states** (for markdown editor save):
- Button disabled with loading spinner
- Semi-transparent overlay prevents multiple clicks

## Performance Considerations

### Debouncing

**Auto-save debouncing:**
- Inline edits: Save immediately on blur (no debounce needed)
- Markdown editor: Debounce 500ms for live preview to avoid excessive re-rendering

### Optimistic Updates

**UI updates before server confirmation:**
1. User edits field and blurs
2. UI immediately updates with new value
3. Supabase API call happens in background
4. If API fails, revert UI to previous value with error message
5. Benefit: Perceived instant response, feels faster

### Data Synchronization

**No real-time sync** (not needed for single-user budget):
- Page loads fresh data on initial load
- All changes made locally update local `originalData` array
- To see others' changes: refresh page (F5 or Cmd+R)

**Future enhancement:**
- Supabase real-time subscriptions to watch for changes
- Show notification: "New changes available. Refresh to see updates."

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| `ESC` | Edit mode (list) | Cancel edits, exit edit mode |
| `ESC` | Markdown editor | Cancel edit, prompt if changes detected |
| `Enter` | Text input (category, item) | Blur input, trigger auto-save |
| `Tab` | Edit mode | Move to next field |
| `Shift+Tab` | Edit mode | Move to previous field |

## Accessibility

### Semantic HTML

- Table uses proper `<thead>`, `<tbody>`, `<th scope="col">` structure
- Form inputs have associated `<label>` elements
- Buttons use descriptive text, not just icons
- ARIA labels for icon-only buttons: `aria-label="Edit item"`

### Keyboard Navigation

- All interactive elements reachable via Tab key
- Edit mode preserves logical tab order
- Focus visible on all inputs and buttons
- ESC key provides consistent cancel behavior

### Screen Readers

- Announce edit mode: `aria-live="polite"` region updates
- Loading states announced: "Loading budget items"
- Success/error messages announced automatically via live regions
- Icon buttons have `aria-label` attributes

### Visual Accessibility

- Color is not sole indicator (icons accompany colors)
- Sufficient contrast ratios (WCAG AA minimum 4.5:1)
- Focus indicators visible for keyboard users
- Text scales with browser zoom

## Testing Checklist

### List Page Inline Editing

- [ ] Click edit icon enters edit mode
- [ ] All fields become editable inputs
- [ ] Tab key moves between fields
- [ ] Blur saves field value to Supabase
- [ ] Saving spinner appears during save
- [ ] Green checkmark appears on success
- [ ] Local data updates after save
- [ ] Budget metrics recalculate
- [ ] ESC key cancels edit mode
- [ ] Checkmark icon exits edit mode
- [ ] Failed save shows error message
- [ ] Failed save reverts to previous value

### Create New Item

- [ ] Click "+ Add New Item" inserts blank row
- [ ] New row appears at top of table
- [ ] New row is in edit mode immediately
- [ ] Category autocomplete suggests existing categories
- [ ] First field blur creates database record
- [ ] Subsequent blurs update normally
- [ ] Delete button removes new row
- [ ] Cannot create multiple new rows simultaneously

### Delete Item

- [ ] Click Delete shows confirmation dialog
- [ ] Cancel dismisses dialog with no action
- [ ] Confirm deletes from database
- [ ] Row fades out smoothly
- [ ] Item removed from local data
- [ ] Budget metrics recalculate
- [ ] Failed delete shows error message

### Markdown Editing

- [ ] Click row navigates to detail page
- [ ] Markdown renders correctly with marked.js
- [ ] Click Edit button enters edit mode
- [ ] Textarea shows raw markdown source
- [ ] Live preview updates as user types
- [ ] Save button saves to Supabase
- [ ] Success shows rendered content
- [ ] Cancel button prompts if changes exist
- [ ] Cancel with no changes exits immediately
- [ ] ESC key same as Cancel button
- [ ] Failed save shows error message

### Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility

- [ ] Keyboard-only navigation works
- [ ] Screen reader announces changes
- [ ] Focus indicators visible
- [ ] Color contrast sufficient
- [ ] Works with browser zoom at 200%

## Future Enhancements

### Batch Editing
- Select multiple rows with checkboxes
- Apply changes to all selected items at once
- Useful for categorization or bulk price updates

### Undo/Redo
- Track change history
- Undo button reverts last change
- Redo button reapplies undone change
- Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z

### Rich Markdown Editor
- WYSIWYG toolbar for markdown formatting
- Insert image/link dialogs
- Syntax highlighting in code blocks
- Table editor for markdown tables

### Offline Support
- Service worker caches app shell
- IndexedDB stores budget data locally
- Sync changes when connection returns
- Visual indicator for offline mode

### Version History
- Track all changes to each item
- View previous versions
- Restore to previous version
- Show who made changes and when (requires auth)

### Collaboration Features
- Real-time updates via Supabase subscriptions
- Show who is currently editing (presence)
- Conflict resolution for simultaneous edits
- Activity feed showing recent changes
