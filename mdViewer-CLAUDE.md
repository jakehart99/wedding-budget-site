# Markdown Viewer Documentation

This document provides detailed guidance for the markdown viewer component (`item.html`) in the Wedding Budget Planner application.

## Overview

The markdown viewer displays individual budget items with rich, long-form content. It combines structured metadata (category, cost, quantity) with freeform markdown content (notes, research, considerations) in a professional, readable layout.

## Design Philosophy

The viewer follows **Apple-inspired document design principles**:

- **Readability First**: Optimal line length (65 characters), generous spacing, refined typography
- **Clear Hierarchy**: Visual distinction between metadata, navigation, and content
- **Progressive Disclosure**: Table of contents for easy navigation, metadata separate from content
- **Professional Polish**: Subtle animations, refined interactions, print-ready layout
- **Content Focus**: Minimal distractions, clean backgrounds, content takes center stage

## Architecture

### Component Structure

```
item.html
├── Header (site-wide)
│   ├── Page title (item name)
│   └── Action buttons (Edit, Print, Back)
├── Main Content Area
│   ├── Breadcrumb Navigation
│   ├── Item Hero Section
│   │   ├── Item name (H1)
│   │   ├── Category badge
│   │   └── Required status badge
│   ├── Metadata Card
│   │   ├── Unit Cost
│   │   ├── Quantity
│   │   ├── Subtotal
│   │   └── Timestamps (created, updated)
│   ├── Table of Contents (auto-generated, sticky)
│   └── Article Body (rendered markdown)
└── Footer (site-wide)
```

### Layout Components

#### 1. Item Hero Section
**Purpose**: Immediately communicate what item you're viewing
**Design**:
- Large H1 title (item name)
- Category badge with color-coded background
- Required status badge (Yes/No)
- Clean, spacious layout with ample padding

#### 2. Metadata Card
**Purpose**: Display structured budget data separate from narrative content
**Design**:
- Card layout with subtle shadow
- Grid layout for metadata fields
- Currency formatting for costs
- Muted text for labels, bold values
- Timestamps in footer of card

**Fields**:
- Unit Cost (formatted as currency)
- Quantity (if applicable)
- Subtotal (calculated)
- Created At (timestamp)
- Updated At (timestamp)

#### 3. Table of Contents
**Purpose**: Navigate long documents efficiently
**Design**:
- Auto-generated from H2 and H3 headings in markdown
- Sticky positioning (stays visible while scrolling)
- Nested list showing document structure
- Active section highlighting
- Smooth scroll to anchors
- Hidden if document has fewer than 3 headings

**Behavior**:
- Automatically parses rendered markdown to extract headings
- Generates anchor IDs for each heading
- Highlights current section based on scroll position
- Smooth scrolls to section when clicked

#### 4. Article Body
**Purpose**: Display rich markdown content with optimal readability
**Design**:
- Max-width 65 characters for optimal line length
- Generous line height (1.7-1.8)
- Refined typography scale
- Proper spacing between elements
- Professional code block styling
- Responsive tables with horizontal scroll
- Print-optimized layout

## Typography Scale

### Reading Optimization
- **Line length**: 65ch max-width for body content (optimal for reading)
- **Line height**: 1.7-1.8 for body text
- **Font size**: 1.125rem (18px) base for comfortable reading

### Heading Scale
```css
h1: 2rem (32px) - Item title, bold, letter-spacing -0.5px
h2: 1.5rem (24px) - Major sections, border-bottom
h3: 1.25rem (20px) - Subsections
h4: 1.125rem (18px) - Minor headings
```

### Content Elements
- **Body text**: 1.125rem, line-height 1.7
- **Lists**: Indented 1.5rem, 0.5rem spacing between items
- **Code inline**: 0.875em, light blue background, terracotta text
- **Code blocks**: Slate blue background, white text, 1rem padding
- **Tables**: 0.9375rem, zebra striping, responsive scroll
- **Blockquotes**: Left border, italic, muted color

## Color Usage

### Semantic Colors
- **Category badges**: Use category-specific colors for visual distinction
- **Required badges**: Green for "Yes", gray for "No"
- **Status indicators**: Success (green), warning (gold), danger (red)
- **Links**: Primary blue, underlined, hover darkens

### Content Backgrounds
- **Article body**: Pure white (#FFFFFF)
- **Code blocks**: Slate blue (#3E5C78) with white text
- **Inline code**: Light blue (#E8F0F4) with terracotta text
- **Metadata card**: White with subtle shadow
- **Table zebra rows**: Light background (#F5EDE2)

## Spacing System

### Vertical Rhythm
All spacing follows the design token system:
- `--spacing-xs`: 0.5rem (8px) - Tight spacing
- `--spacing-sm`: 0.75rem (12px) - Small gaps
- `--spacing-md`: 1rem (16px) - Standard spacing
- `--spacing-lg`: 1.5rem (24px) - Section spacing
- `--spacing-xl`: 2rem (32px) - Major sections
- `--spacing-2xl`: 3rem (48px) - Hero sections

### Content Spacing Rules
- Heading top margin: 2-3x bottom margin (breathing room)
- Paragraph margin: `var(--spacing-md)` (1rem)
- Section spacing: `var(--spacing-xl)` (2rem)
- Code block margin: `var(--spacing-lg)` (1.5rem)
- List item spacing: `var(--spacing-xs)` (0.5rem)

## Markdown Content Styling

### Code Blocks
```css
.markdown-content pre {
  background: var(--color-secondary);    /* Slate blue */
  color: #fff;
  padding: var(--spacing-lg);
  border-radius: var(--radius-sm);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
}
```

**Features**:
- Syntax highlighting-ready background
- Horizontal scroll for long lines
- Monospace font
- Adequate padding for readability

### Tables
```css
.markdown-content table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--spacing-lg) 0;
}
```

**Features**:
- Full width in article
- Zebra striping for row distinction
- Responsive horizontal scroll on mobile
- Header row with background color
- Hover state for rows

### Lists
**Features**:
- Consistent indentation (1.5rem)
- Adequate spacing between items
- Support for nested lists
- Proper alignment of bullets/numbers

### Images
**Features**:
- Max-width 100% (responsive)
- Automatic height
- Border radius for polish
- Centered alignment
- Margin for spacing

## Responsive Behavior

### Desktop (> 768px)
- Two-column layout: TOC (sidebar) + Article (main)
- TOC sticky positioning
- Full typography scale
- Generous padding and margins

### Tablet (481px - 768px)
- Single column layout
- TOC collapses to horizontal nav or hidden
- Slightly reduced typography scale
- Reduced padding

### Mobile (≤ 480px)
- Minimal padding
- Base typography scale
- Tables scroll horizontally
- TOC hidden or collapsed
- Action buttons stack vertically

## Print Styles

### Print Optimization
```css
@media print {
  /* Hide non-content elements */
  header, footer, .back-link, button, .toc { display: none; }

  /* Optimize for print */
  .markdown-content {
    max-width: none;
    box-shadow: none;
    font-size: 11pt;
    line-height: 1.5;
  }

  /* Page break control */
  h1, h2, h3 { page-break-after: avoid; }
  pre, table, img { page-break-inside: avoid; }
}
```

**Features**:
- Remove navigation and actions
- Black text on white background
- Optimized font size for print
- Prevent awkward page breaks
- Include metadata in print output

## Edit Mode

### Markdown Editor Layout
When editing, the page transforms to a split-view editor:

```
┌─────────────────────┬─────────────────────┐
│   Markdown Source   │    Live Preview     │
│   (textarea)        │   (rendered HTML)   │
│                     │                     │
│   - Line numbers    │   - Real-time       │
│   - Syntax help     │   - Scroll sync     │
│   - Auto-save       │   - Full styling    │
└─────────────────────┴─────────────────────┘
```

**Features**:
- 50/50 split on desktop
- Live preview updates as you type (debounced 300ms)
- Markdown syntax hints below textarea
- Save/Cancel buttons in header
- ESC key to cancel
- Unsaved changes warning

### Edit Mode Behavior
- Click "Edit Markdown" button
- Textarea populated with current markdown
- Preview updates in real-time
- Auto-focus textarea at end of content
- Save button updates database and re-renders view
- Cancel button confirms if unsaved changes exist

## JavaScript Functionality

### Table of Contents Generation

```javascript
function generateTableOfContents() {
  const headings = mdContentEl.querySelectorAll('h2, h3');
  if (headings.length < 3) return; // Don't show TOC for short docs

  const toc = document.createElement('nav');
  toc.className = 'toc';

  // Generate nested list from headings
  // Add anchor IDs to headings
  // Create smooth scroll links
  // Inject TOC into layout
}
```

### Active Section Highlighting

```javascript
function updateActiveSection() {
  // Track scroll position
  // Determine which section is in viewport
  // Highlight corresponding TOC link
}
```

### Smooth Scrolling

```javascript
tocLink.addEventListener('click', (e) => {
  e.preventDefault();
  const target = document.getElementById(targetId);
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
```

## Accessibility

### WCAG 2.1 Compliance
- Semantic HTML structure (article, nav, header, footer)
- Proper heading hierarchy (h1 → h2 → h3, no skipping)
- Sufficient color contrast (4.5:1 minimum)
- Keyboard navigation (tab through links, buttons)
- Focus indicators on interactive elements
- ARIA labels where needed (TOC, navigation)
- Alt text for images in markdown
- Screen reader friendly (skip links, landmarks)

### Keyboard Navigation
- Tab: Navigate through links and buttons
- Enter: Activate links and buttons
- ESC: Cancel edit mode
- Ctrl/Cmd + P: Print (browser default)

## Best Practices

### Content Authoring
- Use H2 for major sections (e.g., "## Research & Considerations")
- Use H3 for subsections (e.g., "### Vendor Options")
- Keep paragraphs focused and concise
- Use lists for scannable content
- Use blockquotes for important callouts
- Use code blocks for data, URLs, or technical content
- Add alt text to images: `![Description](url)`

### Metadata Usage
- **Category**: Tag items for grouping (e.g., "Venue", "Catering")
- **Required**: Mark as "Yes" for must-have items
- **Notes**: Short summary in table view
- **md_content**: Full research, considerations, vendor info, etc.

### Performance
- Lazy load images in markdown
- Debounce live preview updates (300ms)
- Use CSS containment for article body
- Minimize reflows during scroll

## Future Enhancements

Potential improvements for future iterations:
- Syntax highlighting for code blocks (Prism.js or highlight.js)
- Image lightbox for enlarged viewing
- Export to PDF functionality
- Related items suggestions
- Version history / change tracking
- Comments or notes on specific sections
- Full-text search within document
- Collapsible sections for long documents
- Dark mode support
- Collaborative editing

## Related Documentation

- See `CLAUDE.md` for overall project architecture
- See `crud-CLAUDE.md` for data operations details
- See `css/style.css` for complete design token system
