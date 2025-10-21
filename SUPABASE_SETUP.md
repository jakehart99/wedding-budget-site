# Supabase Setup Guide

This guide will help you migrate your Wedding Budget Planner from static JSON data to Supabase.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A Supabase project created

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
4. These should already be in your `.env` file

## Step 2: Run the SQL Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Open the file `supabase-schema.sql` in this directory
5. Copy the entire contents and paste into the SQL Editor
6. Click **Run** to execute the script

This will:
- Create the `budget_items` table with all necessary columns
- Set up indexes for better performance
- Enable Row Level Security (RLS) with public access policies
- Create automatic timestamp updates

## Step 3: Migrate Your Data (Optional)

If you want to import your existing data from `data.js`:

1. Open `migrate-to-supabase.html` in your web browser
2. Click **Test Connection** to verify Supabase is set up correctly
3. Click **Start Migration** to upload all items from `data.js`

**Note:** The migration script will preserve the original IDs from your data.

If you want to start fresh, click **Clear Database** first.

## Step 4: Update Your Application Code

You'll need to update your JavaScript files to fetch data from Supabase instead of the static `data.js` file.

### Install Supabase Client

Add this script tag to your HTML files (before your other scripts):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Initialize Supabase Client

Add this to your JavaScript files:

```javascript
const { createClient } = supabase;
const supabaseClient = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);
```

### Fetch Data Example

Replace your `DATA` array usage with Supabase queries:

```javascript
// Fetch all items
async function fetchAllItems() {
  const { data, error } = await supabaseClient
    .from('budget_items')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching items:', error);
    return [];
  }

  // Transform snake_case back to camelCase for your app
  return data.map(item => ({
    id: item.id,
    category: item.category,
    item: item.item,
    required: item.required,
    notes: item.notes,
    unitCost: item.unit_cost,
    quantity: item.quantity,
    subTotal: item.sub_total,
    mdContent: item.md_content,
    html: item.html
  }));
}

// Fetch single item
async function fetchItem(id) {
  const { data, error } = await supabaseClient
    .from('budget_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching item:', error);
    return null;
  }

  return {
    id: data.id,
    category: data.category,
    item: data.item,
    required: data.required,
    notes: data.notes,
    unitCost: data.unit_cost,
    quantity: data.quantity,
    subTotal: data.sub_total,
    mdContent: data.md_content,
    html: data.html
  };
}
```

### Insert New Item Example

```javascript
async function createItem(item) {
  const { data, error } = await supabaseClient
    .from('budget_items')
    .insert([{
      category: item.category,
      item: item.item,
      required: item.required,
      notes: item.notes,
      unit_cost: item.unitCost,
      quantity: item.quantity,
      sub_total: item.subTotal,
      md_content: item.mdContent,
      html: item.html
    }])
    .select();

  if (error) {
    console.error('Error creating item:', error);
    return null;
  }

  return data[0];
}
```

### Update Item Example

```javascript
async function updateItem(id, updates) {
  const { data, error } = await supabaseClient
    .from('budget_items')
    .update({
      category: updates.category,
      item: updates.item,
      required: updates.required,
      notes: updates.notes,
      unit_cost: updates.unitCost,
      quantity: updates.quantity,
      sub_total: updates.subTotal,
      md_content: updates.mdContent,
      html: updates.html
    })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating item:', error);
    return null;
  }

  return data[0];
}
```

### Delete Item Example

```javascript
async function deleteItem(id) {
  const { error } = await supabaseClient
    .from('budget_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting item:', error);
    return false;
  }

  return true;
}
```

## Database Schema

The `budget_items` table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key (auto-increment) |
| `category` | TEXT | Budget category (e.g., "Admin & Legal") |
| `item` | TEXT | Item name |
| `required` | TEXT | "Yes", "No", "Maybe", "Optional" |
| `notes` | TEXT | Additional notes about the item |
| `unit_cost` | NUMERIC(10,2) | Cost per unit |
| `quantity` | NUMERIC(10,2) | Quantity needed |
| `sub_total` | NUMERIC(10,2) | Total cost (unit_cost × quantity) |
| `md_content` | TEXT | Markdown content for detail page |
| `html` | TEXT | Pre-rendered HTML (fallback) |
| `created_at` | TIMESTAMPTZ | Timestamp of creation (auto) |
| `updated_at` | TIMESTAMPTZ | Timestamp of last update (auto) |

## Security Notes

**⚠️ WARNING:** The RLS policies are set to allow **anyone** to read, create, update, and delete items without authentication. This is intentional based on your requirements, but be aware:

- Anyone with access to your website can modify the data
- There is no user authentication or authorization
- All changes are permanent and immediately visible to all users

If you want to add authentication later, you'll need to update the RLS policies in Supabase.

## Useful Supabase Dashboard Links

- **SQL Editor**: https://app.supabase.com/project/_/sql
- **Table Editor**: https://app.supabase.com/project/_/editor
- **Database Settings**: https://app.supabase.com/project/_/settings/database
- **API Settings**: https://app.supabase.com/project/_/settings/api
- **Logs**: https://app.supabase.com/project/_/logs/explorer

## Troubleshooting

### Connection Errors

If you get connection errors:
1. Verify your `.env` file has the correct URL and API key
2. Check that RLS policies are enabled (see SQL schema)
3. Test the connection using the migration tool's "Test Connection" button

### Data Not Showing

If data doesn't appear:
1. Check the browser console for errors
2. Verify data was migrated using Supabase Table Editor
3. Make sure your queries are transforming snake_case to camelCase correctly

### Migration Fails

If migration fails:
1. Check that the SQL schema was run successfully
2. Verify you have the correct Supabase credentials
3. Try smaller batch sizes in the migration script
4. Check Supabase logs for detailed error messages

## Next Steps

After setting up Supabase:
1. Update `js/index.js` to fetch data from Supabase instead of `data.js`
2. Update `js/item.js` to fetch individual items from Supabase
3. Add forms to create/edit/delete items (optional)
4. Consider adding real-time subscriptions to see changes instantly
5. Set up proper environment variable handling for production

## Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview#sql-editor)
