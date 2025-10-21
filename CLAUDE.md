# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Wedding Budget Planner** web application built with vanilla JavaScript, HTML, and CSS. It's a static site with **no build process**, designed to be hosted directly on platforms like Vercel. All data is stored in and retrieved from **Supabase** (PostgreSQL database with real-time capabilities).

The application provides:
- Real-time budget tracking with visual metrics
- Full CRUD operations (Create, Read, Update, Delete) for budget items
- Searchable/filterable/sortable table of wedding expenses
- Detailed item views with markdown-rendered content
- **No authentication required** - anyone can edit, add, or delete items

### Design Philosophy

The UI follows **Apple-inspired design principles**:
- **Clarity**: Clean, minimal aesthetic with ample white space
- **Simplicity**: Intuitive navigation and straightforward interactions
- **Consistency**: Unified visual language across all pages
- **Polish**: Subtle animations, refined typography, warm wedding-themed color palette
- **Accessibility**: WCAG-compliant, keyboard-navigable, screen reader friendly

## Architecture

> **CRUD Operations Guide**: For detailed documentation on how Create, Read, Update, and Delete operations work in this application, see [crud-CLAUDE.md](crud-CLAUDE.md). This includes inline editing, auto-save behavior, markdown editing, visual feedback, and error handling patterns.

> **Markdown Viewer Guide**: For detailed documentation on the markdown viewer/document reader component, see [mdViewer-CLAUDE.md](mdViewer-CLAUDE.md). This includes layout architecture, typography standards, table of contents generation, responsive behavior, and print optimization.

### Data Layer - Supabase Backend

**Database: `budget_items` table in Supabase**
- **Schema**: `id` (BIGSERIAL), `category` (TEXT), `item` (TEXT), `required` (TEXT), `notes` (TEXT), `unit_cost` (NUMERIC), `quantity` (NUMERIC), `sub_total` (NUMERIC), `md_content` (TEXT), `html` (TEXT), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ)
- **Row Level Security (RLS)**: Configured for public access - anyone can SELECT, INSERT, UPDATE, DELETE without authentication
- **Field naming**: Database uses `snake_case`, JavaScript uses `camelCase` (transformed via helper functions)
- **Auto-timestamps**: `created_at` and `updated_at` are automatically managed by database triggers

**Supabase Configuration**:
- Credentials stored in `.env` file (not tracked in git)
- Loaded inline in HTML `<script>` tags as global constants: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Client initialized with: `const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);`

**CRUD Operations** (in `js/index.js`):
- `fetchAllItems()`: SELECT all items, transform snake_case → camelCase
- `createItem(item)`: INSERT with transformed data, return new item with generated ID
- `updateItem(id, updates)`: UPDATE by ID, return updated item
- `deleteItem(id)`: DELETE by ID, return success boolean
- All operations include error handling and user-facing error messages

### Frontend Components

**List View (`index.html` + `js/index.js`)**
- Main table with inline editing - click edit icon to make row cells editable
- "+ Add New Item" button inserts blank editable row at top of table
- Auto-save on blur - changes save instantly when you click away from field
- Client-side filtering (search, category dropdown, "required only" checkbox) and sorting
- Click non-action table cells to navigate to detail view (`item.html?id={id}`)
- Real-time budget metrics: Total Cost, Budget, Remaining, Budget Used (with color-coded status)
- Visual feedback: saving spinner → success checkmark → fade back to normal

**Detail View (`item.html` + `js/item.js`)**
- Fetches single item from Supabase by ID (query parameter `?id={id}`)
- Renders markdown content using **marked.js** library
- Edit button allows inline markdown editing with live preview
- Save/Cancel buttons for markdown content updates
- Back link returns to index page
- Shows "Item not found" if invalid ID

**Styling (`css/style.css`)**
- **Warm Wedding Theme** color palette: Dusty blue primary (#6A8FA1), Terracotta CTA (#C16A47), Slate blue secondary (#3E5C78), Neutral beige background (#F5EDE2)
- CSS custom properties (design tokens) for all colors, spacing, shadows, and typography
- Inline editing states: `.cell-editing`, `.cell-saving`, `.cell-saved`, `.cell-error`
- Markdown editor styles for detail page
- Button styles: `.btn-primary` (terracotta), `.btn-secondary` (neutral), `.btn-danger` (red), `.btn-edit` (blue)
- Responsive breakpoints at 768px and 480px
- Print styles for budget reports

### Key Implementation Details

**Data Transformation**:
- `transformItem(dbItem)`: Converts database snake_case to app camelCase
- `transformToDb(item)`: Converts app camelCase to database snake_case
- Both functions handle null values appropriately

**Budget Calculations**:
- Budget constant: `BUDGET = 35000` (configurable in `js/index.js:10`)
- Subtotal calculation: `unit_cost × quantity` (or `unit_cost` if quantity is null/1)
- Color-coded status: Green (<90%), Orange (90-100%), Red (>100%)
- Metrics always calculated from full `originalData` array, not filtered subset

**Inline Editing Workflow**:
- `enterEditMode(rowElement, item)`: Transforms row cells into editable inputs
- `exitEditMode(rowElement, item)`: Reverts row back to display mode
- `handleCellBlur(cell, item, field)`: Auto-saves field on blur, shows visual feedback
- `addNewItemRow()`: Inserts blank editable row at top of table
- ESC key cancels edits and reverts changes
- After successful save: updates `originalData`, reapplies filters, re-renders affected row

**Filtering & Sorting**:
- All operations work on cloned `filteredData` array to preserve `originalData`
- Sorting: Click table headers to toggle ascending/descending
- Filters applied with AND logic: search term + category + required checkbox
- Sort indicators: CSS classes `sort-asc` and `sort-desc` on `<th>` elements

## Development Workflow

### Running Locally

Since this is a static site with no build process, serve it with any static file server:

```bash
# Using Python (recommended)
python3 -m http.server 8001

# Using Node.js
npx http-server -p 8001

# Using PHP
php -S localhost:8001
```

Then open `http://localhost:8001` in a browser.

**Important**: After making JavaScript changes, do a **hard refresh** to bypass browser cache:
- Mac: `Cmd+Shift+R`
- Windows/Linux: `Ctrl+Shift+R`

### Working with Supabase

**Setup**: See `SUPABASE_SETUP.md` for detailed instructions on:
- Running the SQL schema (`supabase-schema.sql`)
- Configuring RLS policies for public access
- Setting up credentials in `.env`

**Testing Database Connection**:
- Open `test-supabase.html` in browser
- Click "Test Connection" to verify Supabase configuration
- Click "Fetch Items" to retrieve and display data

**Database Schema Changes**:
1. Modify `supabase-schema.sql`
2. Run updated SQL in Supabase SQL Editor
3. Update `transformItem()` and `transformToDb()` functions if field names change
4. Update inline editing cells in `enterEditMode()` function if adding/removing columns

### Code Style

- **No build tools**: Files served as-is, no transpilation or bundling
- **IIFEs**: All JavaScript wrapped in `(() => { ... })()` to avoid global namespace pollution
- **Async/await**: All Supabase operations use modern async patterns
- **Error handling**: Try/catch blocks with user-facing error messages (auto-dismiss after 5 seconds)
- **XSS protection**: `escapeHtml()` function used when injecting user content into DOM
- **Currency formatting**: Always 2 decimal places via `formatCurrency(value, raw)` function
- **Prefer `const`** over `let`; never use `var`

### File Structure

```
final_site/
├── index.html              # Main list view with inline editing table
├── item.html               # Individual item detail page with markdown editor
├── crud-CLAUDE.md          # Detailed CRUD operations documentation
├── CLAUDE.md               # Main project documentation (this file)
├── .env                    # Supabase credentials (not tracked in git)
├── supabase-schema.sql     # Database schema and RLS policies
├── migrate-to-supabase.html # One-time migration tool (optional)
├── test-supabase.html      # Connection testing page
├── SUPABASE_SETUP.md       # Detailed Supabase setup guide
├── css/
│   └── style.css           # All styling with CSS custom properties
└── js/
    ├── index.js            # List page with inline CRUD (~650 lines)
    ├── item.js             # Detail page with markdown editor (~180 lines)
    └── marked.min.js       # Third-party markdown parser
```

## Important Constraints

1. **No Authentication**: RLS policies allow public CRUD access - anyone can modify data
2. **No Static Data**: `data.js` is deprecated - all data comes from Supabase
3. **No Build Process**: Never add bundlers, transpilers, or build tools
4. **Vanilla JavaScript Only**: No frameworks (React, Vue, etc.)
5. **Client-Side Only**: All logic runs in browser; no server-side code
6. **Supabase Client**: Loaded from CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`)

## Common Modifications

### Changing the Budget Amount
Edit `BUDGET` constant in `js/index.js:10`, then refresh browser

### Adding a Table Column
1. Add `<th data-sort="newField">` in `index.html` table header (add to line with other `<th>` elements)
2. Add database column via Supabase SQL Editor
3. Update `transformItem()` and `transformToDb()` in `js/index.js` to include new field
4. Add `<td>` cell rendering in `renderTableRow()` or `renderTable()` function in `js/index.js`
5. Add editable input for the field in `enterEditMode()` function if field should be editable

### Adding a New Filter
1. Add form control in `.controls` div in `index.html`
2. Add event listener in `init()` function
3. Update `applyFilters()` function with new filter logic

### Changing Theme Colors
Edit CSS custom properties in `:root` block in `css/style.css`:
- `--color-primary`: Dusty blue (#6A8FA1)
- `--color-cta`: Terracotta for buttons (#C16A47)
- `--color-secondary`: Slate blue for headers (#3E5C78)
- `--color-background`: Page background (#F5EDE2)
- `--color-success`: Green for good status (#7BA882)
- `--color-warning`: Muted gold (#D4A574)
- `--color-danger`: Muted red (#C16A6A)

## Technical Standards

This application follows modern web development best practices:

- **JAMstack Architecture**: JavaScript + APIs (Supabase) + Markup (static HTML)
- **Progressive Enhancement**: Core content accessible even without JavaScript
- **WCAG 2.1 Compliance**: Semantic HTML, keyboard navigation, screen reader support
- **Mobile-First Responsive Design**: Fluid layouts with touch-friendly interactions
- **Performance Optimized**: Minimal JavaScript, CSS custom properties, font smoothing
- **CDN-Ready**: Designed for deployment to Vercel or similar edge networks

### Data Flow

```
User Action → Event Listener → CRUD Function → Supabase API
                    ↓
              Update originalData → applyFilters() → renderTable()
                    ↓
              Update DOM + Budget Metrics
```

### Error Handling Pattern

All async operations follow this pattern:
```javascript
async function operation() {
  try {
    const { data, error } = await supabaseClient.from('table').operation();
    if (error) {
      console.error('Error:', error);
      showError('User-facing message');
      return null/false;
    }
    return transformedData;
  } catch (err) {
    console.error('Unexpected error:', err);
    showError('An unexpected error occurred');
    return null/false;
  }
}
```
