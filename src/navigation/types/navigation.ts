import { NavigatorScreenParams } from '@react-navigation/native';

// ── Root ─────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main:       NavigatorScreenParams<BottomTabParamList>;
};

// ── Onboarding ────────────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  Welcome:         undefined;
  EmailLogin:      undefined;
  MagicLinkWait:   { email: string };
  Permissions:     undefined;
  ProfileSetup:    undefined;
};

// ── Bottom Tabs ───────────────────────────────────────────────────────────────
export type BottomTabParamList = {
  Dashboard:    NavigatorScreenParams<DashboardStackParamList>;
  Transactions: NavigatorScreenParams<TransactionStackParamList>;
  Plan:         NavigatorScreenParams<PlanStackParamList>;
  Analytics:    NavigatorScreenParams<AnalyticsStackParamList>;
  More:         NavigatorScreenParams<MoreStackParamList>;
  // Hidden tabs (accessible via More screen)
  Accounts:     NavigatorScreenParams<AccountStackParamList>;
  EMI:          NavigatorScreenParams<EmiStackParamList>;
  Ledger:       NavigatorScreenParams<LedgerStackParamList>;
  Groups:       NavigatorScreenParams<GroupStackParamList>;
  Rent:         NavigatorScreenParams<RentStackParamList>;
  Tasks:        NavigatorScreenParams<TaskStackParamList>;
};

// ── Stacks ────────────────────────────────────────────────────────────────────
export type DashboardStackParamList = {
  DashboardHome:  undefined;
  Settings:       undefined;
  Sync:           undefined;
  AASetup:        undefined;
  EmailSetup:     undefined;
  AddTransaction: undefined;
};

export type TransactionStackParamList = {
  TransactionList:   { categoryId?: string; categoryName?: string; fromDate?: number; toDate?: number } | undefined;
  TransactionDetail: { id: string };
  AddTransaction:    undefined;
};

export type EmiStackParamList = {
  EMIList:   undefined;
  EMIDetail: { id: string };
  AddEMI:    { prefill?: { name: string; emiAmount: number; merchantName: string } } | undefined;
};

export type LedgerStackParamList = {
  LedgerHome:   undefined;
  LedgerDetail: { id: string };
  AddLend:      undefined;
};

export type GroupStackParamList = {
  GroupList:   undefined;
  GroupDetail: { id: string };
  AddGroup:    undefined;
  AddExpense:  { groupId: string };
};

export type AccountStackParamList = {
  AccountList: undefined;
};

export type AnalyticsStackParamList = {
  AnalyticsHome:           undefined;
  CategoryBreakdown:       { month?: string };
  CategoryTransactions:    { categoryId: string | null; categoryName: string; fromDate: number; toDate: number };
  TopMerchants:            { month?: string };
  SavingsRate:             undefined;
  Budget:                  undefined;
  CashFlowCalendar:        undefined;
  RecurringTransactions:   undefined;
  EMIBurden:               undefined;
  CategoryTrends:          { categoryId: string; categoryName: string };
  CustomRangeReport:       undefined;
  YearOverYear:            undefined;
  NetWorth:                undefined;
  IncomeAnalysis:          { month?: string };
  LedgerAging:             undefined;
  SpendingPatterns:        undefined;
};

export type PlanStackParamList = {
  PlanHome:            undefined;
  BudgetPlanner:       undefined;
  AICoach:             undefined;
  InvestmentAnalyzer:  undefined;
};

export type MoreStackParamList = {
  MoreHome:      undefined;
  About:         undefined;
  PrivacyPolicy: undefined;
};

export type TaskStackParamList = {
  TaskHome:      undefined;
  TaskDetail:    { id: string };
  AddTask:       { prefill?: { title?: string; description?: string; priority?: 'high' | 'medium' | 'low'; dueDate?: number | null; voiceTranscript?: string; sourceLanguage?: string } } | undefined;
  TaskAnalytics: undefined;
  AddHabit:      { prefillTitle?: string } | undefined;
  HabitDetail:   { id: string };
};

export type RentStackParamList = {
  RentHome:           undefined;
  BuildingList:       undefined;
  BuildingDetail:     { buildingId: string };
  AddBuilding:        { buildingId?: string } | undefined;
  UnitTenants:        { buildingId: string; unitId: string };
  TenantDetail:       { tenantId: string };
  EditTenant:         { tenantId: string };
  AddTenant:          { buildingId: string; unitId: string };
  RentCollection:     { month?: string } | undefined;
  RecordRent:         { recordId: string; tenantId: string };
  TenantStatement:    { tenantId: string };
  MaintenanceLogs:    { buildingId: string };
  AddMaintenance:     { buildingId: string; logId?: string };
  RentSummary:        undefined;
};
