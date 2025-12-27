import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

type Input = {
  /**
   * Start date in YYYY-MM-DD format. If not provided, defaults to 30 days ago.
   */
  from?: string;
  /**
   * End date in YYYY-MM-DD format. If not provided, defaults to today.
   */
  to?: string;
  /**
   * Predefined date range shortcuts: "today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days", "last_90_days"
   * If provided, overrides 'from' and 'to' parameters.
   */
  dateRange?:
    | "today"
    | "yesterday"
    | "this_week"
    | "last_week"
    | "this_month"
    | "last_month"
    | "last_7_days"
    | "last_30_days"
    | "last_90_days";
  /**
   * Filter by entry type: "expense", "income", "transfer", or "all". Defaults to "all".
   */
  type?: "expense" | "income" | "transfer" | "all";
  /**
   * Filter by category names (comma-separated). Example: "Food,Transport,Entertainment"
   */
  categories?: string;
  /**
   * Filter by tag names (comma-separated). Example: "Work,Personal,Urgent"
   */
  tags?: string;
  /**
   * Filter by account names (comma-separated). Example: "Cash,Credit Card,Savings"
   */
  accounts?: string;
  /**
   * Maximum number of entries to return. Defaults to 50, max 200.
   */
  limit?: number;
  /**
   * Search in description. Case-insensitive partial match.
   */
  search?: string;
  /**
   * Include summary statistics. Defaults to true.
   */
  includeSummary?: boolean;
};

function getDateRange(input: Input): { from: string; to: string } {
  const today = new Date();
  const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

  if (input.dateRange) {
    switch (input.dateRange) {
      case "today":
        return { from: formatDate(today), to: formatDate(today) };
      case "yesterday": {
        const yesterday = subDays(today, 1);
        return { from: formatDate(yesterday), to: formatDate(yesterday) };
      }
      case "this_week":
        return {
          from: formatDate(startOfWeek(today, { weekStartsOn: 1 })),
          to: formatDate(endOfWeek(today, { weekStartsOn: 1 })),
        };
      case "last_week": {
        const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 });
        return { from: formatDate(lastWeekStart), to: formatDate(lastWeekEnd) };
      }
      case "this_month":
        return { from: formatDate(startOfMonth(today)), to: formatDate(endOfMonth(today)) };
      case "last_month": {
        const lastMonth = subMonths(today, 1);
        return { from: formatDate(startOfMonth(lastMonth)), to: formatDate(endOfMonth(lastMonth)) };
      }
      case "last_7_days":
        return { from: formatDate(subDays(today, 7)), to: formatDate(today) };
      case "last_30_days":
        return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
      case "last_90_days":
        return { from: formatDate(subDays(today, 90)), to: formatDate(today) };
    }
  }

  return {
    from: input.from || formatDate(subDays(today, 30)),
    to: input.to || formatDate(today),
  };
}

export default async function searchEntries(input: Input) {
  const { from, to } = getDateRange(input);
  const limit = Math.min(input.limit || 50, 200);
  const type = input.type || "all";
  const includeSummary = input.includeSummary !== false;

  // Fetch all data
  const [entries, allCategories, allTags, allAccounts] = await Promise.all([
    toshl.getTransactions({ from, to, per_page: limit }),
    toshl.getCategories(),
    toshl.getTags(),
    toshl.getAccounts(),
  ]);

  // Create lookup maps
  const categoryMap = new Map(allCategories.map((c) => [c.id, c.name]));
  const tagMap = new Map(allTags.map((t) => [t.id, t.name]));
  const accountMap = new Map(allAccounts.map((a) => [a.id, a.name]));

  // Parse filter inputs
  const categoryFilter = input.categories ? input.categories.split(",").map((c) => c.trim().toLowerCase()) : null;
  const tagFilter = input.tags ? input.tags.split(",").map((t) => t.trim().toLowerCase()) : null;
  const accountFilter = input.accounts ? input.accounts.split(",").map((a) => a.trim().toLowerCase()) : null;
  const searchTerm = input.search?.toLowerCase();

  // Filter entries
  const filtered = entries.filter((entry) => {
    // Type filter
    const isTransfer = "transaction" in entry;
    const isExpense = entry.amount < 0 && !isTransfer;
    const isIncome = entry.amount > 0 && !isTransfer;

    if (type === "expense" && !isExpense) return false;
    if (type === "income" && !isIncome) return false;
    if (type === "transfer" && !isTransfer) return false;

    // Category filter
    if (categoryFilter) {
      const categoryName = categoryMap.get(entry.category)?.toLowerCase() || "";
      if (!categoryFilter.some((c) => categoryName.includes(c))) return false;
    }

    // Tag filter
    if (tagFilter) {
      const entryTagNames = entry.tags.map((tid) => tagMap.get(tid)?.toLowerCase() || "");
      if (!tagFilter.some((t) => entryTagNames.some((etn) => etn.includes(t)))) return false;
    }

    // Account filter
    if (accountFilter) {
      const accountName = accountMap.get(entry.account)?.toLowerCase() || "";
      if (!accountFilter.some((a) => accountName.includes(a))) return false;
    }

    // Search filter
    if (searchTerm) {
      const desc = (entry.desc || "").toLowerCase();
      if (!desc.includes(searchTerm)) return false;
    }

    return true;
  });

  // Format entries for output
  const formattedEntries = filtered.map((entry) => {
    const isTransfer = "transaction" in entry;
    let entryType: string;
    if (isTransfer) {
      entryType = "transfer";
    } else if (entry.amount < 0) {
      entryType = "expense";
    } else {
      entryType = "income";
    }

    return {
      id: entry.id,
      date: entry.date.substring(0, 10), // Ensure YYYY-MM-DD only, no time
      description: entry.desc || "No description",
      amount: entry.amount,
      absAmount: Math.abs(entry.amount),
      currency: entry.currency.code,
      type: entryType,
      category: categoryMap.get(entry.category) || "Unknown",
      tags: entry.tags.map((tid) => tagMap.get(tid) || "Unknown"),
      account: accountMap.get(entry.account) || "Unknown",
      isRecurring: !!entry.repeat,
    };
  });

  // Calculate summary
  let summary = {};
  if (includeSummary) {
    const expenses = formattedEntries.filter((e) => e.type === "expense");
    const incomes = formattedEntries.filter((e) => e.type === "income");
    const transfers = formattedEntries.filter((e) => e.type === "transfer");

    const totalExpenses = expenses.reduce((sum, e) => sum + e.absAmount, 0);
    const totalIncome = incomes.reduce((sum, e) => sum + e.absAmount, 0);

    // Group by category
    const expenseByCategory: { [key: string]: number } = {};
    expenses.forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.absAmount;
    });

    const incomeByCategory: { [key: string]: number } = {};
    incomes.forEach((e) => {
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.absAmount;
    });

    // Get top categories
    const topExpenseCategories = Object.entries(expenseByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    const topIncomeCategories = Object.entries(incomeByCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    summary = {
      period: `${from} to ${to}`,
      totalEntries: formattedEntries.length,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      transferCount: transfers.length,
      totalExpenses,
      totalIncome,
      netChange: totalIncome - totalExpenses,
      topExpenseCategories,
      topIncomeCategories,
    };
  }

  return {
    ...(includeSummary ? { summary } : {}),
    entries: formattedEntries,
    _instructions: AI_INSTRUCTIONS,
  };
}
