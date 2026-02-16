# Lead Database - Contact Management System

A comprehensive CRM tool for ScorchLocal with Expected Lead Value (ELV) scoring, market attribution, and advanced contact management.

## Features

### Contact Management
- **CRUD Operations**: Create, read, update, delete contacts
- **Bulk Actions**: Select multiple contacts for export or deletion
- **CSV Import**: Import contacts with column mapping
- **Search & Filter**: Advanced filtering by source, market, opt-ins, ELV range

### Market Attribution
Markets are automatically detected based on priority:
1. API geoTarget (from ad campaigns)
2. City match
3. Phone area code
4. Campaign name

**Predefined Markets:**
- Portland Metro (503/971 area codes)
- SW Washington (360/564 area codes)
- Salem (503/971 area codes)
- Bend (541 area code)
- Other (fallback)

### ELV (Expected Lead Value) Scoring

ELV is calculated using the formula:
```
ELV = Channel Close Rate × Lead Type × Urgency × Keyword Intent × Job Value × Behavioral Score
```

**Factors:**
- **Channel Close Rate** (0-1): Success rate by source
  - Phone: 50%
  - Walk-in: 60%
  - Referral: 45%
  - Direct: 40%
  - Organic: 35%
  - Google Ads: 28%
  - Facebook Ads: 18%
  - Email: 15%

- **Lead Type Multiplier** (0.6-1.8x):
  - Emergency: 1.8x
  - Repeat Customer: 1.5x
  - New Customer: 1.0x
  - Quote Request: 0.8x
  - Consultation: 0.6x

- **Urgency Multiplier** (0.5-2x):
  - Urgent: 2.0x
  - Soon: 1.5x
  - Flexible: 1.0x
  - Planning: 0.5x

- **Keyword Intent Score** (0-1): Based on search keyword quality
- **Job Value**: Estimated project value (default $1000)
- **Behavioral Score** (0-1): Engagement indicators (opt-ins, activity)

### Segments

Predefined smart segments:
- 📧 **Email Opted In**: Contacts who opted in for email
- 💬 **SMS Opted In**: Contacts who opted in for SMS
- 💎 **High Value**: Contacts with ELV > $500
- 🚫 **Unreachable**: No email or phone
- ❄️ **Cold Leads**: No activity in 30+ days
- 🔥 **Hot Leads**: Activity in last 7 days

### Lists

Create custom lists to organize contacts by:
- Campaign
- Project type
- Sales stage
- Custom criteria

## Components

### 1. `types.ts`
Core TypeScript definitions:
- `Contact`: Main contact interface
- `ContactSource`: Lead source types
- `LeadType`, `Urgency`, `MarketName`: Classification enums
- `Market`: Market definition
- `ELVFactors`: ELV calculation breakdown
- `ContactFilters`: Filter criteria
- `Segment`, `ContactList`: Organization types

### 2. `utils.ts`
Utility functions:
- `detectMarket()`: Auto-detect market from contact data
- `calculateELV()`: Calculate Expected Lead Value
- `filterContacts()`: Apply filters to contact list
- `exportToCSV()`: Export contacts to CSV
- `parseCSV()`: Parse uploaded CSV files
- Format helpers: phone, name, source names

### 3. `ContactTable.tsx`
Main contact list view with:
- Sortable columns
- Multi-select checkboxes
- Bulk actions toolbar
- Source and market badges with colors
- Inline contact preview

### 4. `ContactDetail.tsx`
Contact detail modal with tabs:
- **Details**: All contact information
- **Timeline**: Activity history
- **ELV Breakdown**: Detailed scoring factors

### 5. `AddContact.tsx`
Add/edit contact form with:
- Name, contact info, address fields
- Lead details (source, type, urgency)
- Campaign attribution
- Opt-in preferences
- Tags management
- Notes
- Auto-market detection
- Auto-ELV calculation

### 6. `ImportModal.tsx`
CSV import wizard:
1. **Upload**: File selection with format tips
2. **Map**: Column mapping to contact fields
3. **Preview**: Review before import

### 7. `MarketManager.tsx`
Configure service area markets:
- Edit cities for each market
- Edit area codes for each market
- View detection priority
- Market color coding

### 8. `Sidebar.tsx`
Left sidebar with:
- Search box
- Segments list
- Custom lists
- Source filter (checkboxes)
- Market filter (checkboxes)
- Opt-in filters
- ELV range slider
- Clear all filters button

### 9. `supabase.ts`
Supabase integration functions:
- `fetchContacts()`: Load all contacts
- `createContact()`: Add new contact
- `updateContact()`: Edit contact
- `deleteContact()`: Remove contact
- `bulkCreateContacts()`: Import multiple
- `bulkDeleteContacts()`: Delete multiple
- `searchContacts()`: Full-text search
- `getContactStats()`: Summary statistics

Includes complete SQL schema with RLS policies.

## Usage

### Basic Integration

```tsx
import LeadDatabasePage from '@/app/(dashboard)/lead-database/page';

// The page is already set up at /lead-database
// Access it through the dashboard navigation
```

### Switching to Supabase

Currently uses localStorage for demo purposes. To enable Supabase:

1. Run the SQL schema from `supabase.ts` in your Supabase SQL editor
2. Update `page.tsx` to use Supabase functions:

```tsx
import { fetchContacts, createContact, updateContact, deleteContact } from '@/components/tools/LeadDatabase/supabase';

// Replace loadContacts():
const loadContacts = async () => {
  try {
    const data = await fetchContacts();
    setContacts(data);
  } catch (error) {
    console.error('Failed to load contacts:', error);
  } finally {
    setLoading(false);
  }
};

// Replace saveContacts():
const handleAddContact = async (contactData: Partial<Contact>) => {
  const newContact = await createContact(contactData);
  setContacts([...contacts, newContact]);
};
```

### Customizing ELV Formula

Edit `utils.ts` to adjust:
- Channel close rates
- Lead type multipliers
- Urgency multipliers
- Default job value
- Keyword intent scoring

### Adding Custom Fields

1. Update `Contact` interface in `types.ts`
2. Add fields to `AddContact.tsx` form
3. Update Supabase schema
4. Modify `toDbFormat()` and `fromDbFormat()` in `supabase.ts`

## Styling

Uses ScorchLocal design system:
- **Colors**: Flame (primary), Heat, Ember, Char (dark), Ash (light)
- **Components**: `.card`, `.btn-primary`, `.btn-ghost`, `.input`, `.tag`
- **Fonts**: Archivo Black (display), DM Sans (body)
- **Source Colors**: Each source type has a unique color badge
- **Market Colors**: Each market has a distinctive color

## Data Flow

```
User Action
    ↓
Event Handler (page.tsx)
    ↓
State Update (useState)
    ↓
Component Re-render
    ↓
LocalStorage/Supabase Save
```

## Performance

- Contact table is virtualized for large datasets
- Filters apply client-side for instant results
- ELV calculations are cached in contact records
- CSV import processes in chunks for large files

## Security

When using Supabase:
- Row Level Security (RLS) ensures users only see their contacts
- User ID is automatically added to all records
- No SQL injection risk (Supabase handles parameterization)

## Future Enhancements

- [ ] Email integration (send from app)
- [ ] SMS integration
- [ ] Task/follow-up reminders
- [ ] Deal pipeline tracking
- [ ] Custom reports
- [ ] API webhooks for lead sources
- [ ] Duplicate detection
- [ ] Contact merging
- [ ] Activity logging
- [ ] Team collaboration
