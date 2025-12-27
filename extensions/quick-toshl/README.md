# Quick Toshl

A powerful Raycast extension for managing your [Toshl Finance](https://toshl.com) expenses, income, and budgets with both manual commands and AI-powered natural language interactions.

![Raycast](https://img.shields.io/badge/Raycast-Extension-FF6154)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### Manual Commands

| Command | Description |
|---------|-------------|
| **Add Expense** | Quick form to add expenses with category, tags, account, and recurring options |
| **Add Income** | Quick form to add income entries |
| **Add Transfer** | Transfer money between accounts |
| **Recent Transactions** | View, edit, and delete recent transactions (30 days) |
| **Search Entries** | Advanced filtering by date range, type, category, tags, account, and description |
| **Budgets** | View your budget progress and spending limits |

### AI Tools (Raycast AI Chat)

Chat naturally with Raycast AI to manage your finances:

```
"Add 50k for lunch today"
"Show my expenses this month"  
"What's my food budget?"
"List my categories"
```

| AI Tool | Description |
|---------|-------------|
| `add-expense` | Add expenses with Vietnamese shortcuts (50k, 3 triệu) |
| `add-income` | Add income entries |
| `search-entries` | Search and filter transactions |
| `get-budgets` | Check budget status |
| `list-categories-tags` | List categories, tags, and accounts |

### Special Features

- 🇻🇳 **Vietnamese Support**: Amount shortcuts (50k, 3tr, 5 triệu) and bilingual responses
- 📅 **Flexible Dates**: today, yesterday, DD/MM, DD/MM/YYYY
- 🔄 **Recurring Entries**: Daily, weekly, monthly, yearly repeats
- 💱 **Multi-Currency**: Supports all Toshl currencies
- 🔵 **Transfer Detection**: Blue icons for account-to-account transfers
- ⚡ **14-Day Cache**: Fast performance with manual refresh option

---

## 🏗️ Codebase Structure

```
src/
├── components/
│   ├── TransactionForm.tsx   # Shared form for expense/income (create & edit)
│   └── TransferForm.tsx      # Transfer between accounts form
├── tools/                    # AI Chat tools
│   ├── add-expense.ts        # AI: Add expense
│   ├── add-income.ts         # AI: Add income  
│   ├── get-budgets.ts        # AI: Get budget status
│   ├── list-categories-tags.ts # AI: List categories/tags/accounts
│   └── search-entries.ts     # AI: Search & filter entries
├── utils/
│   ├── toshl.ts              # ToshlClient API wrapper with caching
│   ├── types.ts              # TypeScript interfaces
│   └── helpers.ts            # Shared utilities (parseAmount, parseDate)
├── expense.tsx               # Add Expense command
├── income.tsx                # Add Income command
├── transfer.tsx              # Add Transfer command
├── recent-transactions.tsx   # Recent Transactions list
├── search-entries.tsx        # Advanced Search UI
└── budgets.tsx               # Budgets view
```

---

## 🔄 Application Flow

### Adding an Expense (Manual)

```mermaid
graph LR
    A[User opens Add Expense] --> B[TransactionForm loads]
    B --> C[Fetch categories/tags/accounts from cache]
    C --> D[User fills form]
    D --> E[Submit to Toshl API]
    E --> F[Show success toast]
```

### Adding via AI Chat

```mermaid
graph LR
    A[User: 'Add 50k lunch'] --> B[AI calls add-expense tool]
    B --> C[parseAmount: 50k → 50000]
    C --> D[list-categories-tags for mapping]
    D --> E[POST to Toshl API]
    E --> F[AI confirms in user's language]
```

### Caching Flow

```mermaid
graph TD
    A[Request categories/tags/accounts] --> B{Cache valid?}
    B -->|Yes, < 14 days| C[Return cached data]
    B -->|No or Force Refresh| D[Fetch from Toshl API]
    D --> E[Store in cache]
    E --> C
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe development |
| **React** | Raycast UI components |
| **@raycast/api** | Raycast extension framework |
| **@raycast/utils** | useCachedPromise, usePromise hooks |
| **Axios** | HTTP client for Toshl API |
| **date-fns** | Date manipulation and formatting |

---

## ⚙️ Configuration

### Required

- **Toshl API Key**: Get from [Toshl Developer Settings](https://developer.toshl.com/)

### Optional

- **Default Currency**: Default currency code (e.g., VND, USD)
- **Force Refresh Cache**: Clear 14-day cache manually

---

## 🚀 Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Lint
npm run lint
```

---

## 📝 API Reference

This extension uses the [Toshl API v2](https://developer.toshl.com/docs/):

- `GET /entries` - List transactions
- `POST /entries` - Create transaction/transfer
- `PUT /entries/:id` - Update transaction
- `DELETE /entries/:id` - Delete transaction
- `GET /categories` - List categories
- `GET /tags` - List tags
- `GET /accounts` - List accounts
- `GET /budgets` - List budgets
- `GET /currencies` - List supported currencies

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
