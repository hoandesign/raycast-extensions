import { ActionPanel, Action, List, useNavigation, Icon, Color, confirmAlert, Alert } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import { TransactionForm } from "./components/TransactionForm";
import { Transaction } from "./utils/types";
import { format, subDays } from "date-fns";

export default function RecentTransactions() {
  const { push, pop } = useNavigation();

  // Fetch transactions from the last 30 days
  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const {
    data: transactions,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(() => toshl.getTransactions({ from: thirtyDaysAgo, to: today, per_page: 50 }));
  const { data: categories } = useCachedPromise(() => toshl.getCategories());
  const { data: tags } = useCachedPromise(() => toshl.getTags());
  const { data: accounts } = useCachedPromise(() => toshl.getAccounts());

  async function handleDelete(transaction: Transaction, mode?: "one" | "tail" | "all") {
    const isRecurring = !!transaction.repeat;
    const message = isRecurring
      ? mode === "one"
        ? "Delete only this occurrence?"
        : mode === "tail"
          ? "Delete this and all future occurrences?"
          : "Delete ALL occurrences (past and future)?"
      : "Are you sure you want to delete this transaction?";

    if (
      await confirmAlert({
        title: "Delete Transaction",
        message,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await mutate(toshl.deleteTransaction(transaction.id, mode), {
        optimisticUpdate: (data) => data?.filter((t) => t.id !== transaction.id),
      });
    }
  }

  function getCategoryName(id: string) {
    return categories?.find((c) => c.id === id)?.name || "Unknown Category";
  }

  function getTagName(id: string) {
    return tags?.find((t) => t.id === id)?.name || "";
  }

  function getAccountName(id: string) {
    return accounts?.find((a) => a.id === id)?.name || "Unknown";
  }

  function getAccountCurrency(id: string) {
    return accounts?.find((a) => a.id === id)?.currency.code || "";
  }

  // Helper to detect transfers
  const isTransfer = (t: Transaction) => !!t.transaction?.account;

  return (
    <List isLoading={isLoading}>
      {transactions?.map((transaction) => {
        const entryIsTransfer = isTransfer(transaction);
        const toAccountId = transaction.transaction?.account;

        // Determine icon and subtitle based on type
        let icon;
        let subtitle;
        if (entryIsTransfer) {
          icon = { source: Icon.Switch, tintColor: Color.Blue };
          subtitle = `${getAccountName(transaction.account)} → ${toAccountId ? getAccountName(toAccountId) : "Unknown"}`;
        } else if (transaction.amount < 0) {
          icon = { source: Icon.ArrowDown, tintColor: Color.Red };
          subtitle = getCategoryName(transaction.category);
        } else {
          icon = { source: Icon.ArrowUp, tintColor: Color.Green };
          subtitle = getCategoryName(transaction.category);
        }

        return (
          <List.Item
            key={transaction.id}
            icon={icon}
            title={transaction.desc || (entryIsTransfer ? "Transfer" : "No Description")}
            subtitle={subtitle}
            accessories={[
              ...(!entryIsTransfer ? [{ text: (transaction.tags || []).map(getTagName).join(", ") }] : []),
              {
                text: `${Math.abs(transaction.amount).toLocaleString()} ${transaction.currency.code}`,
                tooltip: `Account: ${getAccountCurrency(transaction.account)}`,
              },
              ...(transaction.repeat
                ? [
                    {
                      icon: Icon.ArrowClockwise,
                      tooltip: `Repeats ${transaction.repeat.frequency}${transaction.repeat.interval > 1 ? ` every ${transaction.repeat.interval}` : ""}`,
                    },
                  ]
                : []),
              { date: new Date(transaction.date) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Edit">
                  <Action
                    title="Edit This Entry"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(
                        <TransactionForm
                          type={transaction.amount < 0 ? "expense" : "income"}
                          transaction={transaction}
                          onSubmit={async (values) => {
                            await toshl.updateTransaction(
                              transaction.id,
                              values,
                              transaction.repeat ? "one" : undefined,
                            );
                            revalidate();
                            pop();
                          }}
                        />,
                      )
                    }
                  />
                  {transaction.repeat && (
                    <>
                      <Action
                        title="Edit This & Future"
                        icon={Icon.Forward}
                        onAction={() =>
                          push(
                            <TransactionForm
                              type={transaction.amount < 0 ? "expense" : "income"}
                              transaction={transaction}
                              onSubmit={async (values) => {
                                await toshl.updateTransaction(transaction.id, values, "tail");
                                revalidate();
                                pop();
                              }}
                            />,
                          )
                        }
                      />
                      <Action
                        title="Edit All Occurrences"
                        icon={Icon.List}
                        onAction={() =>
                          push(
                            <TransactionForm
                              type={transaction.amount < 0 ? "expense" : "income"}
                              transaction={transaction}
                              onSubmit={async (values) => {
                                await toshl.updateTransaction(transaction.id, values, "all");
                                revalidate();
                                pop();
                              }}
                            />,
                          )
                        }
                      />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Delete">
                  <Action
                    title={transaction.repeat ? "Delete This Only" : "Delete Transaction"}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(transaction, transaction.repeat ? "one" : undefined)}
                  />
                  {transaction.repeat && (
                    <>
                      <Action
                        title="Delete This & Future"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(transaction, "tail")}
                      />
                      <Action
                        title="Delete All Occurrences"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() => handleDelete(transaction, "all")}
                      />
                    </>
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Toshl" url="https://toshl.com/app/expenses" />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
