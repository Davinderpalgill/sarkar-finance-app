# Sarkar — Finance App Architecture

> **App Name:** Sarkar
> **Bundle ID:** `com.davindergill.financetracker`
> **Version:** 1.0.0
> **Framework:** React Native 0.73.4
> **Language:** TypeScript 5.0.4
> **Platform:** iOS + Android

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Navigation Architecture](#4-navigation-architecture)
5. [State Management](#5-state-management)
6. [Local Database — SQLite](#6-local-database--sqlite)
7. [Cloud Sync — Firebase & Firestore](#7-cloud-sync--firebase--firestore)
8. [Data Import Pipeline](#8-data-import-pipeline)
9. [ML & Parsing Pipeline](#9-ml--parsing-pipeline)
10. [Services](#10-services)
11. [Screens (56 total)](#11-screens-56-total)
12. [Custom Hooks](#12-custom-hooks)
13. [Background Tasks](#13-background-tasks)
14. [iOS-Specific Architecture](#14-ios-specific-architecture)
15. [Android-Specific Architecture](#15-android-specific-architecture)
16. [AI / LLM Integration](#16-ai--llm-integration)
17. [Security & Auth](#17-security--auth)
18. [Key Constants & Thresholds](#18-key-constants--thresholds)
19. [Rent Collection Module](#19-rent-collection-module)
20. [UI & Navigation Conventions](#20-ui--navigation-conventions)
21. [Data Flow Examples](#21-data-flow-examples)
22. [Dependencies Reference](#22-dependencies-reference)

---

## 1. High-Level Overview

Sarkar is a personal finance tracker that automatically imports bank transactions from Gmail (iOS) or SMS (Android), categorises them using a local TFLite ML model, and syncs everything to Firebase Firestore. It also tracks EMIs, lent/borrowed money (ledger), group expense splits, budgets, provides AI-powered financial analysis via Groq's Llama models, and includes a full rent collection module for landlords.

```
┌─────────────────────────────────────────────────────────┐
│                     SARKAR APP                          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Gmail   │  │   SMS    │  │  Manual  │  ← Sources  │
│  │ (iOS)    │  │(Android) │  │  Entry   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       └─────────────┴─────────────┘                    │
│                      ↓                                  │
│           ┌─────────────────────┐                       │
│           │  ML Parse Pipeline  │  ← 7-step parsing    │
│           │  (TFLite + Groq)    │                       │
│           └──────────┬──────────┘                       │
│                      ↓                                  │
│           ┌─────────────────────┐                       │
│           │  SQLite (local DB)  │  ← Primary store     │
│           └──────────┬──────────┘                       │
│                      ↓                                  │
│           ┌─────────────────────┐                       │
│           │ Firebase Firestore  │  ← Cloud sync        │
│           └─────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | React Native | 0.73.4 |
| **Language** | TypeScript | 5.0.4 |
| **State** | Zustand | 4.5.1 |
| **Local DB** | react-native-sqlite-storage | 6.0.1 |
| **Cloud DB** | Firebase Firestore | 23.8.6 |
| **Auth** | Firebase Auth | 23.8.6 |
| **Navigation** | React Navigation v6 | 6.1.10 |
| **ML (local)** | TensorFlow.js + TFLite | 4.17.0 |
| **ML (cloud)** | Groq API — Llama 3.3 70B / 3.1 8B | — |
| **Gmail** | Google Sign-In + Gmail REST API | 16.1.2 |
| **Notifications** | Notifee | 7.8.2 |
| **Background** | react-native-background-fetch | 4.2.5 |
| **Biometrics** | react-native-biometrics | 3.0.1 |
| **Charts** | Victory Native | 40.1.0 |
| **Animations** | React Native Reanimated | 3.6.2 |
| **Gestures** | React Native Gesture Handler | 2.14.1 |
| **Permissions** | react-native-permissions | 4.1.4 |
| **Icons** | react-native-vector-icons (Material) | 10.0.3 |
| **Dates** | date-fns | 3.3.1 |
| **Storage** | AsyncStorage | 1.23.1 |

---

## 3. Project Structure

```
FinanceApp/
├── index.js                    # RN entry point
├── App.tsx                     # Root component — startup, background tasks
├── app.json                    # App name, bundle config
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
│
├── src/
│   ├── api/
│   │   └── firebase/
│   │       ├── auth.ts         # Firebase Auth helpers
│   │       ├── firestore.ts    # Firestore CRUD operations
│   │       └── syncManager.ts  # Bi-directional sync orchestrator
│   │
│   ├── config/
│   │   ├── constants.ts        # App-wide constants & thresholds
│   │   ├── categories.ts       # Default category definitions
│   │   ├── theme.ts            # Design tokens (colours, spacing, fonts)
│   │   └── firebase.ts         # Firebase initialisation
│   │
│   ├── components/
│   │   ├── common/             # Shared UI components
│   │   ├── transactions/       # TransactionItem, CategoryPill, etc.
│   │   ├── emi/                # EMICard, InstallmentProgress
│   │   ├── ledger/             # LedgerEntryCard, SettlementHistory
│   │   └── groups/             # GroupMemberList, SplitBreakdown
│   │
│   ├── hooks/
│   │   ├── useTransactions.ts
│   │   ├── useEMI.ts
│   │   ├── useLedger.ts
│   │   ├── useGroups.ts
│   │   ├── useSync.ts
│   │   ├── useSmsReader.ts
│   │   ├── usePermissions.ts
│   │   └── useCategoryMap.ts
│   │
│   ├── ml/
│   │   ├── SmsParser.ts        # 7-step SMS parse pipeline
│   │   ├── EmailParser.ts      # Gmail email parser
│   │   ├── BankPatterns.ts     # Regex patterns per bank
│   │   ├── CategoryClassifier.ts # TFLite category classification
│   │   ├── MerchantDetector.ts # Merchant vs person classification
│   │   ├── EMIDetector.ts      # EMI detection from SMS
│   │   ├── TFLiteBridge.ts     # Native TFLite model bridge
│   │   └── AADataParser.ts     # Account Aggregator data parser
│   │
│   ├── models/
│   │   ├── Transaction.ts
│   │   ├── Category.ts
│   │   ├── EMI.ts
│   │   ├── LedgerEntry.ts
│   │   ├── Group.ts
│   │   ├── Split.ts
│   │   ├── Budget.ts
│   │   ├── Reminder.ts
│   │   ├── Building.ts         # Rent — property/building
│   │   ├── RentUnit.ts         # Rent — individual unit/flat
│   │   ├── RentTenant.ts       # Rent — tenant lease info
│   │   ├── RentRecord.ts       # Rent — monthly payment record (+ ExtraCharge)
│   │   └── MaintenanceLog.ts   # Rent — maintenance expense log
│   │
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Root navigator (auth + biometric gate)
│   │   ├── BottomTabNavigator.tsx  # 5-tab bottom nav
│   │   ├── types/
│   │   │   └── navigation.ts       # All navigation types (incl. RentStackParamList)
│   │   └── stacks/
│   │       ├── DashboardStack.tsx
│   │       ├── TransactionStack.tsx
│   │       ├── AnalyticsStack.tsx
│   │       ├── PlanStack.tsx
│   │       ├── MoreStack.tsx
│   │       ├── AccountStack.tsx
│   │       ├── EmiStack.tsx
│   │       ├── LedgerStack.tsx
│   │       ├── GroupStack.tsx
│   │       ├── RentStack.tsx       # Rent collection stack (14 screens)
│   │       └── OnboardingStack.tsx
│   │
│   ├── screens/
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   ├── analytics/          # 17 analytics screens
│   │   ├── plan/               # AI Coach, Investment Analyzer, Budget
│   │   ├── more/
│   │   ├── accounts/
│   │   ├── emi/
│   │   ├── ledger/
│   │   ├── groups/
│   │   ├── onboarding/
│   │   ├── settings/
│   │   └── rent/               # 14 rent collection screens
│   │       ├── RentHomeScreen.tsx
│   │       ├── BuildingListScreen.tsx
│   │       ├── AddBuildingScreen.tsx
│   │       ├── BuildingDetailScreen.tsx
│   │       ├── UnitTenantsScreen.tsx
│   │       ├── AddUnitScreen.tsx
│   │       ├── AddTenantScreen.tsx
│   │       ├── EditTenantScreen.tsx
│   │       ├── TenantDetailScreen.tsx
│   │       ├── TenantStatementScreen.tsx
│   │       ├── RecordRentScreen.tsx
│   │       ├── RentCollectionScreen.tsx
│   │       ├── RentSummaryScreen.tsx
│   │       └── MaintenanceLogsScreen.tsx
│   │
│   ├── services/
│   │   ├── GmailService.ts
│   │   ├── SmsService.ts
│   │   ├── AnthropicService.ts  # Groq LLM wrapper
│   │   ├── AAService.ts         # Account Aggregator (Setu FIU)
│   │   ├── BiometricService.ts
│   │   ├── ReminderService.ts
│   │   ├── NotificationService.ts
│   │   ├── ContactsService.ts
│   │   └── MarketDataService.ts
│   │
│   ├── storage/
│   │   ├── database.ts          # SQLite init & migration runner
│   │   ├── schema.ts            # Table definitions (schema v9)
│   │   └── repositories/
│   │       ├── TransactionRepository.ts
│   │       ├── EMIRepository.ts
│   │       ├── LedgerRepository.ts
│   │       ├── GroupRepository.ts
│   │       ├── BudgetRepository.ts
│   │       └── RentRepository.ts  # All rent CRUD + suggestions
│   │
│   ├── store/
│   │   ├── transactionStore.ts
│   │   ├── emiStore.ts
│   │   ├── ledgerStore.ts
│   │   ├── groupStore.ts
│   │   ├── budgetStore.ts
│   │   ├── rentStore.ts         # Buildings, units, tenants, records
│   │   └── uiStore.ts
│   │
│   └── utils/
│       ├── currencyUtils.ts     # Paise ↔ Rupee conversion
│       ├── dateUtils.ts
│       ├── generateId.ts        # UUID v4 wrapper
│       ├── stringUtils.ts
│       └── customCategories.ts
│
├── ios/
│   ├── FinanceApp.xcworkspace   # Always open this in Xcode
│   ├── Podfile                  # CocoaPods dependencies
│   └── FinanceApp/
│       ├── AppDelegate.mm
│       ├── Info.plist
│       ├── GoogleService-Info.plist
│       └── Images.xcassets/
│           └── AppIcon.appiconset/
│
└── android/
    ├── app/
    │   ├── google-services.json
    │   └── src/main/java/com/financeapp/
    │       ├── modules/
    │       │   ├── SmsModule.java
    │       │   ├── SmsReceiver.java
    │       │   └── SmsEventEmitter.java
    │       └── ml/
    │           └── TFLiteModule.java
    └── build.gradle
```

---

## 4. Navigation Architecture

```
AppNavigator
├── [Not logged in] → OnboardingStack
│   ├── WelcomeScreen
│   ├── PermissionsScreen
│   ├── ProfileSetupScreen
│   └── EmailLoginScreen
│
├── [Logged in, biometric enabled] → BiometricLockScreen
│
└── [Logged in] → BottomTabNavigator (5 tabs)
    ├── Tab 1: Dashboard
    │   └── DashboardScreen
    │
    ├── Tab 2: Transactions
    │   ├── TransactionListScreen
    │   ├── TransactionDetailScreen
    │   └── AddTransactionScreen
    │
    ├── Tab 3: Analytics (17 screens)
    │   ├── AnalyticsHomeScreen
    │   ├── BudgetScreen
    │   ├── SpendingPatternsScreen
    │   ├── TopMerchantsScreen
    │   ├── SavingsRateScreen
    │   ├── CashFlowCalendarScreen
    │   ├── IncomeAnalysisScreen
    │   ├── CategoryTrendsScreen
    │   ├── NetWorthScreen
    │   ├── LedgerAgingScreen
    │   ├── CustomRangeReportScreen
    │   ├── YearOverYearScreen
    │   ├── RecurringTransactionsScreen
    │   ├── CategoryBreakdownScreen
    │   └── EMIBurdenScreen
    │
    ├── Tab 4: Plan
    │   ├── PlanHomeScreen
    │   ├── AICoachScreen          ← Groq Llama 3.1 8B
    │   ├── InvestmentAnalyzerScreen ← Groq Llama 3.3 70B
    │   └── BudgetPlannerScreen    ← 50/30/20 rule (local)
    │
    └── Tab 5: More
        ├── MoreHomeScreen
        ├── AccountsScreen
        ├── EMIListScreen / EMIDetailScreen
        ├── LedgerScreen / AddLendScreen / LedgerDetailScreen
        ├── GroupListScreen / GroupDetailScreen / AddGroupScreen / AddExpenseScreen
        ├── RentStack (14 screens)               ← Rent Collection Module
        │   ├── RentHomeScreen                   # Dashboard: collection summary
        │   ├── BuildingListScreen               # All buildings
        │   ├── AddBuildingScreen                # Create/edit building
        │   ├── BuildingDetailScreen             # Units in a building
        │   ├── UnitTenantsScreen                # Tenants/history for a unit
        │   ├── AddUnitScreen                    # Create/edit unit
        │   ├── AddTenantScreen                  # Onboard tenant
        │   ├── EditTenantScreen                 # Edit tenant details
        │   ├── TenantDetailScreen               # Tenant overview + actions
        │   ├── TenantStatementScreen            # Full payment history
        │   ├── RecordRentScreen                 # Record payment + extra charges
        │   ├── RentCollectionScreen             # Month-wide collection view
        │   ├── RentSummaryScreen                # Analytics / income summary
        │   └── MaintenanceLogsScreen            # Maintenance expense log
        └── Settings/
            ├── SettingsScreen
            ├── SyncScreen
            ├── EmailSetupScreen   ← Gmail account management
            └── AASetupScreen      ← Account Aggregator
```

**RentStack home button convention:** Every screen in RentStack except `RentHomeScreen` shows a home icon (`MaterialIcons name="home"`) in the header that calls `navigation.popToTop()`, jumping back to `RentHomeScreen` in one tap. See [Section 20](#20-ui--navigation-conventions) for details.

---

## 5. State Management

Uses **Zustand** — lightweight, no boilerplate, persists nothing to disk (SQLite handles persistence).

### Stores

#### `transactionStore`
```typescript
{
  transactions: Transaction[]
  uncategorized: Transaction[]     // needs user category confirmation
  loading: boolean
  loadTransactions(userId, page?)
  addTransaction(tx)
  assignCategory(txId, categoryId)
  loadUncategorized(userId)
}
```

#### `emiStore`
```typescript
{
  emis: EMI[]
  loading: boolean
  loadEmis(userId)
  addEmi(emi)
  markInstallmentPaid(emiId, installmentNumber)
  getUpcomingDue(userId, daysAhead)
}
```

#### `ledgerStore`
```typescript
{
  entries: LedgerEntry[]
  loading: boolean
  loadLedger(userId)
  addEntry(entry)
  settleEntry(entryId, amount, transactionId?)
}
```

#### `groupStore`
```typescript
{
  groups: Group[]
  splits: Split[]
  loading: boolean
  loadGroups(userId)
  addGroup(group)
  addSplit(split)
  getGroupBalances(groupId)
}
```

#### `budgetStore`
```typescript
{
  budgets: Budget[]
  loadBudgets(userId, month)
  setBudget(userId, month, categoryId, limitAmount)
}
```

#### `rentStore`
```typescript
{
  buildings: Building[]
  units: RentUnit[]
  tenants: RentTenant[]
  records: RentRecord[]
  loading: boolean

  loadBuildings(userId)
  loadUnits(buildingId)
  loadTenants(buildingId)
  loadMonthlyRecords(userId, month)

  addBuilding(userId, name, address) → Building
  updateBuilding(id, name, address)
  deleteBuilding(id)               // soft-delete: archives building

  addUnit(buildingId, userId, unitNumber, monthlyRent, securityDeposit) → RentUnit
  updateUnit(id, unitNumber, monthlyRent, securityDeposit)
  updateUnitNote(unitId, note)
  deleteUnit(id)

  addTenant(data)                  // also triggers ensureMonthlyRecords
  updateTenant(id, data)
  removeTenant(tenantId)           // deactivates, frees unit
  returnDeposit(tenantId)

  recordPayment(recordId, amountPaid, mode, txId?, note?, lateFee?, extraCharges?)
  ensureMonthlyRecords(userId, month)
}
```

**Payment status logic:** `amountPaid >= (amountDue + lateFee + sum(extraCharges)) ? 'paid' : 'partial'`

#### `uiStore`
```typescript
{
  userId: string | null
  isOnboarded: boolean
  syncing: boolean
  lastSyncedAt: number | null
  syncError: string | null
  setUserId(id)
  setSyncing(bool)
  setSyncError(msg)
}
```

---

## 6. Local Database — SQLite

**Schema Version:** 9
**Storage:** `react-native-sqlite-storage`
**Key principle:** All monetary values stored in **paise** (integer), never floats.

### Migration History

| Version | Changes |
|---------|---------|
| v1 | Initial schema — transactions, categories, emis, emi_installments, ledger_entries, settlements, groups, splits, reminders |
| v2 | `transactions.source` column |
| v3 | `budgets` table |
| v4 | `transactions.gmail_account` column |
| v5 | Rent tables — buildings, rent_units, rent_tenants, rent_records (indexes) |
| v6 | `rent_tenants.documents` TEXT column (JSON array) |
| v7 | `buildings.status` column (active/archived) |
| v8 | `rent_units.note`, `rent_tenants.escalation_rate`, `rent_tenants.deposit_returned`, `rent_records.late_fee`, `maintenance_logs` table |
| v9 | `rent_records.extra_charges` TEXT column (JSON array of ExtraCharge) |

**Self-heal pattern:** `database.ts` also calls `ensureColumn()` for all critical columns regardless of version, guarding against cases where a migration was stamped before it ran successfully.

### Tables

#### `transactions`
The core table. Every bank transaction from SMS, Gmail, AA, or manual entry.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID v4 |
| user_id | TEXT | Firebase user ID |
| amount | INTEGER | In paise |
| type | TEXT | `credit` / `debit` |
| category_id | TEXT FK | → categories |
| category_confidence | REAL | 0–1, from TFLite |
| merchant_type | TEXT | `merchant` / `person` / `unknown` |
| merchant_name | TEXT | |
| bank_name | TEXT | HDFC, SBI, etc. |
| sms_id | TEXT UNIQUE | Dedup key (also used for email IDs) |
| source | TEXT | `sms` / `email` / `aa` / `manual` |
| gmail_account | TEXT | Which Gmail account imported this |
| is_emi | INTEGER | Boolean flag |
| is_split | INTEGER | Boolean flag |
| is_ledger | INTEGER | Boolean flag |
| synced_at | INTEGER | NULL = unsynced |

**Indexes:** user+date, type, category, bank, unsynced (partial index)

#### `emis`
EMI loan tracking.

| Column | Type | Notes |
|--------|------|-------|
| principal_amount | INTEGER | Paise |
| emi_amount | INTEGER | Monthly payment in paise |
| total_installments | INTEGER | |
| paid_installments | INTEGER | |
| next_due_date | INTEGER | Epoch ms |
| status | TEXT | `active` / `completed` / `defaulted` / `paused` |
| detected_from_sms | INTEGER | Auto-detected via EMIDetector |
| detection_confidence | REAL | ML confidence score |

#### `emi_installments`
One row per monthly installment, linked to parent EMI.

#### `ledger_entries`
Money lent or borrowed.

| Column | Type | Notes |
|--------|------|-------|
| direction | TEXT | `lent` / `borrowed` |
| person_name | TEXT | |
| principal_amount | INTEGER | Paise |
| settled_amount | INTEGER | Running total settled |
| status | TEXT | `open` / `partially_settled` / `settled` |

#### `settlements`
Partial or full settlement history for ledger entries.

#### `groups` + `splits`
Group expense splitting. Members stored as JSON array. Split method: `equally` / `exact` / `percentage` / `shares`.

#### `reminders`
Notification scheduling. Linked to EMI or ledger entries. Tracks `fired` and `cancelled` state.

#### `budgets`
Monthly budget limits per category. Unique constraint on `(user_id, month, category_id)`.

#### `categories`
System and custom categories. Keywords array used for rule-based fallback classification.

#### `buildings`
Rental property buildings.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID v4 |
| user_id | TEXT | Owner |
| name | TEXT | Building name |
| address | TEXT | |
| status | TEXT | `active` / `archived` (soft-delete) |

#### `rent_units`
Individual units / flats within a building.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| building_id | TEXT FK | → buildings (CASCADE) |
| user_id | TEXT | |
| unit_number | TEXT | e.g. "2A", "Ground Floor" |
| monthly_rent | INTEGER | Paise |
| security_deposit | INTEGER | Paise |
| status | TEXT | `vacant` / `occupied` |
| tenant_id | TEXT | Current active tenant (nullable) |
| note | TEXT | Free-form landlord note (nullable) |

#### `rent_tenants`
Tenant lease records. One active tenant per unit at a time.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| unit_id | TEXT FK | → rent_units |
| building_id | TEXT FK | → buildings |
| user_id | TEXT | |
| name | TEXT | |
| phone | TEXT | |
| whatsapp_number | TEXT | Optional WhatsApp number |
| lease_start | INTEGER | Epoch ms |
| lease_end | INTEGER | Epoch ms (nullable = open-ended) |
| monthly_rent | INTEGER | Paise (may differ from unit default) |
| due_day | INTEGER | Day of month rent is due (default 5) |
| escalation_rate | REAL | Annual % rent escalation |
| deposit_returned | INTEGER | Boolean — 0/1 |
| status | TEXT | `active` / `inactive` |
| documents | TEXT | JSON array of document references |

#### `rent_records`
Monthly rent payment records. One record per tenant per month.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| tenant_id | TEXT FK | → rent_tenants |
| unit_id | TEXT | |
| building_id | TEXT | |
| user_id | TEXT | |
| month | TEXT | `YYYY-MM` format |
| amount_due | INTEGER | Base rent in paise |
| late_fee | INTEGER | Late fee in paise (default 0) |
| extra_charges | TEXT | JSON: `[{label, amount}]` — electricity, food, etc. |
| amount_paid | INTEGER | Total paid in paise |
| payment_date | INTEGER | Epoch ms (nullable) |
| payment_mode | TEXT | `cash` / `upi` / `bank` / `mapped` |
| transaction_id | TEXT | Linked transaction ID if mode=mapped |
| status | TEXT | `pending` / `partial` / `paid` / `overdue` |
| note | TEXT | Optional payment note |

**Unique constraint:** `(tenant_id, month)` — one record per tenant per calendar month.

**ExtraCharge structure:**
```typescript
interface ExtraCharge {
  label: string;   // e.g. "Electricity", "Food"
  amount: number;  // in paise
}
```

**Total due formula:** `amount_due + late_fee + SUM(extra_charges[].amount)`

#### `maintenance_logs`
Maintenance expense tracking per building/unit.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | |
| building_id | TEXT | |
| unit_id | TEXT | Nullable (building-wide vs unit-specific) |
| user_id | TEXT | |
| title | TEXT | |
| amount | INTEGER | Paise |
| category | TEXT | `general`, `plumbing`, `electrical`, etc. |
| description | TEXT | Nullable |
| date | INTEGER | Epoch ms |

---

## 7. Cloud Sync — Firebase & Firestore

### Authentication
Firebase Email/Password auth. `onAuthStateChanged` drives the entire navigation gate.

### Firestore Structure
```
/users/{userId}/
  ├── transactions/{txId}
  ├── emis/{emiId}
  ├── ledger/{entryId}
  ├── groups/{groupId}       ← top-level, shared across members
  └── splits/{splitId}
```

**Note:** Rent data (buildings, units, tenants, records) is stored locally only (SQLite). It is not synced to Firestore.

### Sync Strategy — `syncManager.ts`
- **Bi-directional**, last-write-wins conflict resolution
- Uses `updatedAt` timestamp for conflict detection
- Runs every **30 seconds** in the background
- Batch size: 100 records per Firestore operation

```typescript
// Sync flow per entity type:
1. Push:  find local records where synced_at IS NULL
          → upsert to Firestore
          → mark synced_at = now

2. Pull:  fetch Firestore records where updatedAt > lastSyncTime
          → for each remote record:
              if not local OR remote.updatedAt > local.updatedAt
                → insert/update local SQLite
```

---

## 8. Data Import Pipeline

### iOS — Gmail Import

```
Google Sign-In (OAuth2, gmail.readonly scope)
    ↓
Gmail REST API
    https://gmail.googleapis.com/gmail/v1/users/me/messages
    Query: bank domain filter + date range
    ↓
fetchMessageDetail() — decode base64url body
    ↓
EmailParser.parseAndStore()
    ↓
7-step ML pipeline → Transaction
    ↓
TransactionRepository.insert()
```

**Supported bank email domains (25+):**
`@hdfcbank.net`, `@onlinesbi.com`, `@icicibank.com`, `@axisbank.com`, `@kotak.com`, `@idfcfirstbank.com`, `@paytmbank.com`, `@phonepe.com`, `@yesbank.in`, `@indusind.com`, `@pnbindia.in`, `@canarabank.in` and more.

**Multi-account support:**
Multiple Gmail accounts can be connected simultaneously. Each has its own token (`@gmail_token_{email}`) and last-sync timestamp (`@gmail_sync_{email}`).

**Token refresh flow:**
1. `signInSilently()` → clear cached token → `getTokens()` (fresh)
2. On 401: clear stored token → force refresh → retry once

**Sync triggers:**
- Every app launch (on `userId` becoming available)
- Foreground resume (if > 24h since last sync)
- Background fetch (every 24h)

---

### Android — SMS Import

```
Native SmsModule.java
    ↓ readInboxSms(lookbackMs)
    ↓
React Native bridge → SmsService.importHistoricalSms()
    ↓
SmsParser.parseSms() — 7-step pipeline
    ↓
TransactionRepository.insert()
```

**Supported bank SMS senders:**
`HDFC`, `SBIBNK`, `ICICIB`, `AXISBK`, `KOTAKB`, `IDFCFB`, `PHONEPE`, `GPAY`, `PAYTM`, `YESBNK`, `INDBNK`, `PNBSMS`, `BOIIND`, `CANBNK`, `UNIONB`, `SCBNK`

**Lookback:** 180 days, max 500 SMS per batch
**Real-time:** `SmsReceiver.java` broadcasts new SMS via `NativeEventEmitter`

**Platform note:** `SmsModule` is an Android-only native module. The Import SMS button in the UI is wrapped in `Platform.OS === 'android'` and is hidden entirely on iOS to prevent crashes.

---

## 9. ML & Parsing Pipeline

### 7-Step SMS Parse Pipeline (`SmsParser.ts`)

```
Input: RawSmsInput { id, address, body, date }
         ↓
Step 1: Bank Detection + Regex Parsing (BankPatterns.ts)
        → amount, type (debit/credit), merchant, balance,
          account last4, reference number, UPI ID
         ↓
Step 2: Native ML Kit Entity Extraction (via native module)
        → structured entities from text
         ↓
Step 3: TFLite Category Classification (CategoryClassifier.ts)
        → categoryId + confidence (0–1)
         ↓
Step 4: Merchant vs Person Detection (MerchantDetector.ts)
        → merchantType: 'merchant' | 'person' | 'unknown'
         ↓
Step 5: EMI Detection (EMIDetector.ts)
        → isEmi: boolean, emiInfo
         ↓
Step 6: Confidence Gate
        → if confidence < 0.75: flag for user confirmation
         ↓
Step 7: Transaction Object Creation + Store
        → TransactionRepository.insert()

Output: ParseResult { transaction, needsCategoryConfirm, emiDetected }
```

### TFLite Model
- Bundled in app assets (iOS + Android)
- Text classification → category ID + confidence
- Bridge: `TFLiteBridge.ts` (JS) ↔ `TFLiteModule.java` / CocoaPods (native)
- Fallback: keyword rules from `categories.ts` if model unavailable

### EMI Detection (`EMIDetector.ts`)
- Pattern matches phrases like "EMI", "loan debit", "equated monthly"
- Cross-references amount consistency with existing EMI records
- Confidence threshold: 0.80

### Merchant Detection (`MerchantDetector.ts`)
- Checks UPI ID suffixes (`@razorpay`, `@paytm`, `@ybl`, etc.)
- Keyword matching against `MERCHANT_KEYWORDS` list
- Distinguishes person-to-person transfers from merchant payments

---

## 10. Services

### `GmailService.ts`
Multi-account Gmail OAuth integration. Handles token refresh, bank email filtering, and incremental sync.

### `SmsService.ts`
Android SMS reading via native bridge. Historical import (180-day lookback) and real-time event subscription. **Android only** — not called on iOS.

### `AnthropicService.ts`
Groq API wrapper. Despite the file name, uses **Groq** (not Anthropic).
- Model for categorisation: `llama-3.1-8b-instant`
- User-provided API key stored in AsyncStorage (`@llm_api_key`)
- In-memory result cache keyed on first 200 chars of text
- Falls back to TFLite if no key configured

### `MarketDataService.ts`
Fetches live Indian market data (Nifty 50, Bank Nifty, Gold ETF, Silver ETF, Nifty Realty) via Yahoo Finance unofficial API. Used by InvestmentAnalyzerScreen.

### `AAService.ts`
Account Aggregator integration via **Setu FIU** (Financial Information User).
- Initiates consent flow
- Polls for approved consent
- Parses AA data via `AADataParser.ts`
- Sandbox mode available; production requires server-side decryption

### `BiometricService.ts`
Face ID / Touch ID via `react-native-biometrics`. Toggle in Settings. Lock screen shown on every cold launch if enabled.

### `ReminderService.ts`
Schedules local push notifications for EMI due dates (3 days before) and ledger entries (1 day before).

### `NotificationService.ts`
Wraps **Notifee** library. Three notification channels: `emi-reminders`, `ledger-reminders`, `general`.

### `ContactsService.ts`
Device contact lookup. Resolves phone numbers to names for ledger entries and group splits.

---

## 11. Screens (56 total)

| Section | Screen | Description |
|---------|--------|-------------|
| **Dashboard** | DashboardScreen | Overview, balance, recent transactions |
| **Transactions** | TransactionListScreen | Paginated list |
| | TransactionDetailScreen | View/edit single transaction |
| | AddTransactionScreen | Manual entry |
| **Analytics** | AnalyticsHomeScreen | Analytics hub |
| | BudgetScreen | Budget vs actual |
| | SpendingPatternsScreen | Spending trends |
| | TopMerchantsScreen | Merchant breakdown |
| | SavingsRateScreen | Income vs expenses |
| | CashFlowCalendarScreen | Heatmap calendar |
| | IncomeAnalysisScreen | Income sources |
| | CategoryTrendsScreen | Category over time |
| | NetWorthScreen | Assets vs liabilities |
| | LedgerAgingScreen | Debt aging |
| | CustomRangeReportScreen | Date range reports |
| | YearOverYearScreen | YoY comparison |
| | RecurringTransactionsScreen | Recurring detection |
| | CategoryBreakdownScreen | Pie charts |
| | EMIBurdenScreen | EMI vs income ratio |
| **Plan** | PlanHomeScreen | Planning hub |
| | AICoachScreen | Groq Llama 3.1 8B chat |
| | InvestmentAnalyzerScreen | Groq Llama 3.3 70B analysis |
| | BudgetPlannerScreen | 50/30/20 rule (local) |
| **EMI** | EMIListScreen | All EMIs |
| | EMIDetailScreen | Single EMI + installments |
| **Ledger** | LedgerScreen | Lent/borrowed overview |
| | AddLendScreen | Create ledger entry |
| | LedgerDetailScreen | View/settle entry |
| **Groups** | GroupListScreen | Group expense splits |
| | GroupDetailScreen | Single group |
| | AddGroupScreen | Create group |
| | AddExpenseScreen | Add split expense |
| **Accounts** | AccountsScreen | Connected bank accounts |
| **More** | MoreHomeScreen | Navigation hub |
| **Rent** | RentHomeScreen | Monthly collection dashboard |
| | BuildingListScreen | All properties |
| | AddBuildingScreen | Create / edit building |
| | BuildingDetailScreen | Units in building |
| | UnitTenantsScreen | Tenant history per unit |
| | AddUnitScreen | Create / edit unit |
| | AddTenantScreen | Onboard new tenant |
| | EditTenantScreen | Edit tenant details |
| | TenantDetailScreen | Full tenant overview |
| | TenantStatementScreen | Complete payment history |
| | RecordRentScreen | Record payment + extra charges |
| | RentCollectionScreen | Month-wide collection view |
| | RentSummaryScreen | Income analytics |
| | MaintenanceLogsScreen | Maintenance expense log |
| **Onboarding** | WelcomeScreen | App intro |
| | PermissionsScreen | Permission requests |
| | ProfileSetupScreen | User profile |
| | EmailLoginScreen | Firebase auth |
| **Settings** | SettingsScreen | App settings, biometric |
| | SyncScreen | Manual sync + status |
| | EmailSetupScreen | Gmail management |
| | AASetupScreen | Account Aggregator |

---

## 12. Custom Hooks

| Hook | Purpose |
|------|---------|
| `useTransactions` | Wraps transactionStore, handles pagination and loading |
| `useEMI` | EMI list, upcoming dues |
| `useLedger` | Lent/borrowed entries |
| `useGroups` | Group expenses, balances |
| `useSync` | Triggers Firestore sync, exposes syncing/error state |
| `useSmsReader` | Android SMS import, permission handling |
| `usePermissions` | SMS, contacts, notifications permission management |
| `useCategoryMap` | Fast `Map<categoryId, Category>` lookup from store |

---

## 13. Background Tasks

### Background Fetch (every 24 hours)
Configured via `react-native-background-fetch`:
- `minimumFetchInterval`: 1440 minutes
- `stopOnTerminate`: false (runs after app killed)
- `startOnBoot`: true
- `enableHeadless`: true (Android)

**Tasks performed:**
1. Check upcoming EMIs (next 4 days) → schedule Notifee reminders
2. Run Gmail sync for all connected accounts

### App Foreground Listener
`AppState.addEventListener('change')` — when app comes back from background:
- Checks if > 24h since last Gmail sync
- If yes, runs `runGmailSync(userId)`

### App Launch
`useEffect` on `userId` — every cold launch:
- **iOS:** `runGmailSync(userId)` — always, no throttle
- **Android:** `importHistoricalSms(userId)` — always, no throttle

---

## 14. iOS-Specific Architecture

### Gmail Integration
- Google Sign-In configured with `gmail.readonly` OAuth scope
- iOS client ID: `871317632339-pp2lh2vms9ubj9f0vnpiodh11qmhkdf2`
- Web client ID: `871317632339-nio29a8oqc6cqhp4b2u1k2t7ofodhsk7`
- URL scheme: `com.googleusercontent.apps.871317632339-pp2lh2vms9ubj9f0vnpiodh11qmhkdf2`

### CocoaPods
Dependencies managed via Podfile. Always open `FinanceApp.xcworkspace`, not `.xcodeproj`.

### App Icon
All sizes generated and placed in `Images.xcassets/AppIcon.appiconset/`:
- `icon-20@2x.png`, `icon-20@3x.png`
- `icon-29@2x.png`, `icon-29@3x.png`
- `icon-40@2x.png`, `icon-40@3x.png`
- `icon-60@2x.png`, `icon-60@3x.png`
- `icon-1024.png` (App Store)

### Info.plist Permissions
- `NSFaceIDUsageDescription` — Biometric lock
- `NSContactsUsageDescription` — Ledger contact matching
- `NSLocalNetworkUsageDescription` — Dev Metro connection

### Firebase
`GoogleService-Info.plist` in `ios/FinanceApp/` — contains Firebase project credentials.

### Platform-Specific UI
- Import SMS button: **hidden on iOS** (`Platform.OS === 'android'` guard in DashboardScreen). `SmsModule` is an Android-only native module; calling it on iOS crashes the app.

---

## 15. Android-Specific Architecture

### Native Modules

#### `SmsModule.java`
Exposes SMS reading to React Native:
- `readInboxSms(lookbackMs)` — queries Android ContentProvider
- Returns array of `{ id, address, body, date }`
- Registered via `SmsPackage.java` in `MainApplication.java`

#### `SmsReceiver.java`
BroadcastReceiver for real-time incoming SMS:
- Listens to `android.provider.Telephony.SMS_RECEIVED`
- Emits to JS via `SmsEventEmitter.java` → `NativeEventEmitter`

#### `TFLiteModule.java`
Native TFLite inference:
- Loads `.tflite` model from assets at startup
- `runInference(text)` → `{ categoryId, confidence }`

### Required Permissions (AndroidManifest.xml)
- `READ_SMS`
- `RECEIVE_SMS`
- `READ_CONTACTS`
- `POST_NOTIFICATIONS`
- `USE_BIOMETRIC`
- `INTERNET`

### Firebase
`google-services.json` in `android/app/` — Firebase Android credentials.

---

## 16. AI / LLM Integration

### Category Classification — `AnthropicService.ts`
- **Provider:** Groq
- **Model:** `llama-3.1-8b-instant`
- **Endpoint:** `https://api.groq.com/openai/v1/chat/completions`
- **Purpose:** Classify transaction descriptions to categories
- **Config:** User enters Groq API key in Settings (validated with `gsk_` prefix)
- **Cache:** In-memory, keyed on first 200 chars of text
- **Fallback:** TFLite model (offline, no API key needed)

### AI Financial Coach — `AICoachScreen.tsx`
- **Model:** `llama-3.1-8b-instant`
- **Max tokens:** 512
- **Temperature:** 0.7
- **Context:** Last 3 months of real transaction data injected into system prompt
  - Monthly income/expenses, savings rate, top categories, EMI count

### Investment Analyzer — `InvestmentAnalyzerScreen.tsx`
- **Model:** `llama-3.3-70b-versatile`
- **Max tokens:** 600
- **Temperature:** 0.3
- **Data:** Live market data from Yahoo Finance (Nifty 50, Bank Nifty, Gold ETF, Silver, Realty)
- **Output:** TOP PICK, SECTOR OUTLOOK, AVOID, STRATEGY (under 400 words)

### Budget Planner — `BudgetPlannerScreen.tsx`
- **No AI** — pure local 50/30/20 rule calculation against SQLite transaction data

---

## 17. Security & Auth

### Authentication Flow
1. Firebase Email/Password sign-in
2. `onAuthStateChanged` → sets `userId` in `uiStore`
3. All SQLite queries scoped to `userId`
4. Firestore rules enforce user-level data isolation

### Biometric Lock
- `react-native-biometrics` — Face ID (iOS), Fingerprint (Android)
- Lock screen shown on every cold launch if enabled
- Setting persisted in AsyncStorage

### Token Management (Gmail)
- Access tokens stored per-account in AsyncStorage
- Tokens cleared and refreshed via `clearCachedAccessToken` + `getTokens()`
- 401 retry: stale token removed → force refresh → retry once

### Data Privacy
- Raw SMS bodies stored locally in SQLite only
- Only parsed transaction fields synced to Firestore
- Firestore data scoped under `/users/{userId}/` with security rules
- Rent data (buildings, units, tenants, records) stored locally only — not synced to Firestore

---

## 18. Key Constants & Thresholds

```typescript
// ML Confidence Thresholds
CATEGORY_CONFIDENCE_THRESHOLD:  0.75   // Ask user if below this
MERCHANT_CONFIDENCE_THRESHOLD:  0.70
EMI_CONFIDENCE_THRESHOLD:       0.80

// Sync
SYNC_INTERVAL_MS:               30_000  // Firestore sync check
MAX_SYNC_BATCH:                 100     // Records per Firestore batch

// Reminders
DEFAULT_EMI_REMINDER_DAYS:      3       // Days before due date
DEFAULT_LEDGER_REMINDER_DAYS:   1

// SMS Import
SMS_IMPORT_LOOKBACK_DAYS:       180     // 6 months
MAX_SMS_BATCH:                  500     // Per import run

// Background
BACKGROUND_FETCH_INTERVAL_MINUTES: 1440 // 24 hours

// Pagination
DEFAULT_PAGE_SIZE:              20

// Rent — Transaction Matching
RENT_SUGGESTION_TOLERANCE:      0.10    // ±10% of due amount for credit match
```

---

## 19. Rent Collection Module

The Rent module lets landlords manage multiple properties, units, and tenants, and track monthly rent collection including late fees, extra charges, and maintenance.

### Data Model Hierarchy

```
User
 └── Building (property)
      └── RentUnit (flat/room)
           └── RentTenant (active lease)
                └── RentRecord (one per month)
                     └── ExtraCharge[] (electricity, food, etc.)
```

### Key Flows

#### Onboarding a Tenant
```
AddBuilding → AddUnit → AddTenant
                            ↓
              RentRepository.insertTenant()
                            ↓
              ensureMonthlyRecords(userId, currentMonth)
              ← creates RentRecord for current month immediately
                            ↓
              rent_units.status = 'occupied', tenantId = tenant.id
```

#### Recording a Payment (RecordRentScreen)
```
Open RecordRentScreen (from TenantStatementScreen or RentCollectionScreen)
    ↓
Summary card shows: Base Rent + Late Fee + Extra Charges = Total Due
    ↓
User enters:
  • Payment Amount
  • Late Fee (optional)
  • Extra Charges — preset chips (Electricity, Water, Food, Internet,
                    Maintenance, Other) or custom label + amount
  • Payment Mode: Cash / UPI / Bank Transfer / Mapped Transaction
  • Note (optional)
    ↓
If mode = 'Mapped Transaction':
  → Show suggested credit transactions within ±10% of due amount
  → User selects matching transaction → amount + mode auto-filled
    ↓
handleSave():
  amountPaid >= (amountDue + lateFee + extraChargesTotal)
    → status = 'paid'
  else
    → status = 'partial'
    ↓
RentRepository.updateRentRecord() → SQLite
rentStore.records updated in-memory
navigation.goBack()
```

#### Monthly Records Generation
`ensureMonthlyRecords(userId, month)` runs:
- On tenant onboarding
- When opening RentCollectionScreen / RentHomeScreen for a new month
- Creates one `rent_record` per active tenant for the given month
- Uses `UNIQUE(tenant_id, month)` constraint with `INSERT OR IGNORE` — safe to call multiple times

#### Suggested Transaction Matching
`RentRepository.getSuggestedTransactions(userId, amountDue, month)`:
- Queries `transactions` table for `type = 'credit'`
- Filters: `amount BETWEEN amountDue * 0.9 AND amountDue * 1.1`
- Filters: `transaction_date` within the rent month
- Returns up to 5 suggestions, ordered by closest amount

### Extra Charges
Stored as JSON in `rent_records.extra_charges`:

```typescript
// ExtraCharge in RentRecord.ts
interface ExtraCharge {
  label: string;   // "Electricity", "Food", "Water", etc.
  amount: number;  // paise (integer)
}

// Example stored value:
// '[{"label":"Electricity","amount":85000},{"label":"Food","amount":300000}]'
```

Preset quick-add chips in `RecordRentScreen`: Electricity, Water, Food, Internet, Maintenance, Other.

### Building Archive (Soft Delete)
`deleteBuilding()` calls `RentRepository.archiveBuilding(id)` which sets `status = 'archived'` rather than deleting rows. Historical rent records are preserved. Archived buildings are excluded from `getBuildings()` queries.

---

## 20. UI & Navigation Conventions

### Home Button in RentStack

Every screen in `RentStack` except `RentHomeScreen` (the root) includes a home icon in the header that calls `navigation.popToTop()`, jumping back to `RentHomeScreen` in one tap instead of requiring multiple back presses.

**Two placement patterns:**

**Pattern A — screen has a spacer on the right** (replaced with home icon):
```tsx
// Before
<View style={{ width: 24 }} />

// After
<TouchableOpacity onPress={() => navigation.popToTop()}>
  <MaterialIcons name="home" size={22} color="#4B4B4B" />
</TouchableOpacity>
```
Screens: BuildingListScreen, UnitTenantsScreen, TenantStatementScreen, RentSummaryScreen

**Pattern B — screen already has an icon on the right** (wrapped in a row):
```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
  <TouchableOpacity onPress={() => navigation.popToTop()}>
    <MaterialIcons name="home" size={22} color="#4B4B4B" />
  </TouchableOpacity>
  <TouchableOpacity onPress={existingAction}>
    <MaterialIcons name="edit" size={22} color="#8257E6" />
  </TouchableOpacity>
</View>
```
Screens: BuildingDetailScreen (+ edit), RentCollectionScreen (+ send), MaintenanceLogsScreen (+ add), TenantDetailScreen (+ conditional edit)

**Save screens excluded:** `AddBuildingScreen`, `AddUnitScreen`, `AddTenantScreen`, `EditTenantScreen`, `RecordRentScreen`, `AddMaintenanceScreen` — no home button to prevent accidental navigation away from unsaved data.

### Monetary Display
All amounts stored as paise (integer). Display-only conversion:
```typescript
function formatRupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}
```

### Dark Theme Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0D0D0D` | Screen background |
| Card | `#1A1A1A` | Cards, inputs |
| Border | `#2C2C2C` | Dividers, input borders |
| Text primary | `#FFFFFF` | Headings, values |
| Text secondary | `#6B6B6B` | Labels, placeholders |
| Text muted | `#4B4B4B` | Placeholder text |
| Accent purple | `#8257E6` | Primary action, active states |
| Success green | `#00C896` | Paid status, positive amounts |
| Error red | `#FF4757` | Late fees, remove buttons |

### Platform-Specific Rendering (SMS)
```tsx
// DashboardScreen.tsx — Import SMS hidden on iOS
{Platform.OS === 'android' && (
  <TouchableOpacity style={styles.importBtn} onPress={importSms}>
    <Text style={styles.importText}>📩  Import SMS</Text>
  </TouchableOpacity>
)}
```
`SmsModule` is an Android-only native module. Calling it on iOS throws a native exception. Always guard SMS functionality with `Platform.OS === 'android'`.

---

## 21. Data Flow Examples

### SMS Transaction (Android)

```
SmsReceiver.java receives SMS
    ↓
NativeEventEmitter → JS SmsService
    ↓
SmsParser.parseSms(rawSms)
    ├── BankPatterns.applyPattern()   → amount, type, merchant
    ├── CategoryClassifier.classify() → categoryId (TFLite)
    ├── MerchantDetector.detect()     → merchant/person
    ├── EMIDetector.isEmi()           → emiDetected
    └── confidence < 0.75?
           YES → flag needsCategoryConfirm
           NO  → proceed
    ↓
TransactionRepository.insert(tx)  → SQLite
    ↓
useTransactionStore.addTransaction()
    ↓
if needsCategoryConfirm → show CategoryPopup to user
    ↓
syncManager (every 30s) → Firestore
```

### Gmail Sync (iOS)

```
App launch → useEffect(userId)
    ↓
GmailService.runGmailSync(userId)
    ↓
getConnectedGmailAccounts()        → AsyncStorage
    ↓
for each account:
    getAccessTokenForAccount(email)
        → signInSilently() → clearCachedAccessToken → getTokens()
        → on 401: remove stored token → forceRefresh → retry
    ↓
    importGmailTransactions(userId, email, fromMs, now)
        → Gmail API: /messages?q=(bank domains) after:X before:Y
        → fetchMessageDetail() per message
        → EmailParser.parseAndStore()
            → 7-step ML pipeline → TransactionRepository
    ↓
    setItem(@gmail_sync_{email}, now)
    ↓
setItem(@gmail_last_sync, now)  ← legacy key for 24h check
```

### Rent Payment Recording

```
User taps month in TenantStatementScreen
    ↓
navigate('RecordRent', { recordId, tenantId })
    ↓
RecordRentScreen mounts:
    RentRepository.getRecordById(recordId)   → base rent, existing charges
    RentRepository.getTenantById(tenantId)   → tenant name
    RentRepository.getSuggestedTransactions() → matching credit transactions
    ↓
User fills: amount, lateFee, extraCharges[], mode, note
    ↓
handleSave():
    amountPaise = parseFloat(amount) * 100
    lateFeePaise = parseFloat(lateFee) * 100
    charges = extraCharges.filter(valid).map(paise)
    ↓
rentStore.recordPayment(recordId, amountPaise, mode, txId, note, lateFeePaise, charges)
    ↓
    totalDue = amountDue + lateFee + SUM(charges[].amount)
    status = amountPaid >= totalDue ? 'paid' : 'partial'
    ↓
RentRepository.updateRentRecord() → SQLite
rentStore.records updated in-memory
    ↓
navigation.goBack()
```

---

## 22. Dependencies Reference

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react-native` | 0.73.4 | Core framework |
| `react` | 18.2.0 | React |
| `zustand` | 4.5.1 | State management |
| `@react-native-firebase/app` | 23.8.6 | Firebase core |
| `@react-native-firebase/auth` | 23.8.6 | Authentication |
| `@react-native-firebase/firestore` | 23.8.6 | Cloud database |
| `@react-native-google-signin/google-signin` | 16.1.2 | Gmail OAuth |
| `@react-navigation/native` | 6.1.10 | Navigation core |
| `@react-navigation/native-stack` | 6.9.18 | Stack navigator |
| `@react-navigation/bottom-tabs` | 6.5.12 | Tab navigator |
| `react-native-sqlite-storage` | 6.0.1 | Local SQLite DB |
| `@react-native-async-storage/async-storage` | 1.23.1 | Key-value store |
| `@tensorflow/tfjs` | 4.17.0 | TensorFlow.js |
| `@tensorflow/tfjs-react-native` | 0.8.0 | TFLite bridge |
| `@notifee/react-native` | 7.8.2 | Push notifications |
| `react-native-background-fetch` | 4.2.5 | Background tasks |
| `react-native-biometrics` | 3.0.1 | Face ID / Touch ID |
| `react-native-permissions` | 4.1.4 | Runtime permissions |
| `react-native-contacts` | 7.0.8 | Device contacts |
| `react-native-gesture-handler` | 2.14.1 | Gesture system |
| `react-native-reanimated` | 3.6.2 | Animations |
| `react-native-safe-area-context` | 4.9.0 | Safe area insets |
| `react-native-screens` | 3.29.0 | Native screen optimisation |
| `react-native-vector-icons` | 10.0.3 | Material Icons |
| `victory-native` | 40.1.0 | Charts & graphs |
| `@gorhom/bottom-sheet` | 4.6.1 | Bottom sheet modals |
| `date-fns` | 3.3.1 | Date utilities |
| `uuid` | 9.0.0 | UUID generation |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.0.4 | Type safety |
| `eslint` | 8.19.0 | Linting |
| `prettier` | 2.8.8 | Code formatting |
| `@react-native/metro-config` | 0.73.3 | Metro bundler config |
| `@babel/core` | 7.20.0 | JS transpilation |

---

*Generated from source — Sarkar Finance App v1.0.0 — Schema v9*
