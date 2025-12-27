import axios, { AxiosInstance } from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Transaction, Category, Tag, TransactionInput, TransferInput, Account, Currency, Budget } from "./types";

interface Preferences {
  apiKey: string;
  forceRefreshCache?: boolean;
}

const BASE_URL = "https://api.toshl.com";

// Cache TTL in milliseconds (14 days)
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ToshlClient {
  private api: AxiosInstance;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor() {
    const { apiKey, forceRefreshCache } = getPreferenceValues<Preferences>();

    // Clear cache if force refresh is enabled
    if (forceRefreshCache) {
      this.cache.clear();
    }

    this.api = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message;

        let title = "API Error";
        if (error.response?.status === 401) {
          title = "Invalid API Key";
        } else if (error.response?.status === 400) {
          title = "Bad Request";
        }

        showToast({
          style: Toast.Style.Failure,
          title: title,
          message: message,
        });
        return Promise.reject(error);
      },
    );
  }

  async getTransactions(params: { from?: string; to?: string; page?: number; per_page?: number } = {}) {
    try {
      const response = await this.api.get<Transaction[]>("/entries", { params });
      return response.data;
    } catch (e) {
      console.error("Failed to get transactions", e);
      throw e;
    }
  }

  async addTransaction(transaction: TransactionInput) {
    try {
      const response = await this.api.post<Transaction>("/entries", transaction);
      return response.data;
    } catch (e) {
      console.error("Failed to add transaction", e);
      throw e;
    }
  }

  async addTransfer(transfer: TransferInput) {
    try {
      const response = await this.api.post<Transaction>("/entries", transfer);
      return response.data;
    } catch (e) {
      console.error("Failed to add transfer", e);
      throw e;
    }
  }

  async updateTransaction(id: string, transaction: TransactionInput, mode?: "one" | "tail" | "all") {
    try {
      const params = mode ? { update: mode } : {};
      console.log("Update request:", { id, params, payload: JSON.stringify(transaction) });
      const response = await this.api.put<Transaction>(`/entries/${id}`, transaction, { params });
      return response.data;
    } catch (e: unknown) {
      const error = e as { response?: { data?: unknown; status?: number } };
      console.error("Failed to update transaction:", {
        status: error.response?.status,
        data: error.response?.data,
        payload: transaction,
      });
      throw e;
    }
  }

  async deleteTransaction(id: string, mode?: "one" | "tail" | "all") {
    try {
      const params = mode ? { delete: mode } : {};
      await this.api.delete(`/entries/${id}`, { params });
    } catch (e) {
      console.error("Failed to delete transaction", e);
      throw e;
    }
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCategories(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    const cacheKey = "categories";
    const cached = this.getCached<Category[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<Category[]>("/categories", { params });
      const data = response.data.filter((c) => !c.deleted);
      this.setCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error("Failed to get categories", e);
      throw e;
    }
  }

  async getTags(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    const cacheKey = "tags";
    const cached = this.getCached<Tag[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<Tag[]>("/tags", { params });
      const data = response.data.filter((t) => !t.deleted);
      this.setCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error("Failed to get tags", e);
      throw e;
    }
  }

  async getAccounts(params: { page?: number; per_page?: number } = { per_page: 100 }) {
    const cacheKey = "accounts";
    const cached = this.getCached<Account[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<Account[]>("/accounts", { params });
      const data = response.data.sort((a, b) => a.order - b.order);
      this.setCache(cacheKey, data);
      return data;
    } catch (e) {
      console.error("Failed to get accounts", e);
      throw e;
    }
  }

  async getCurrencies() {
    const cacheKey = "currencies";
    const cached = this.getCached<Currency[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.api.get<{ [key: string]: Omit<Currency, "code"> }>("/currencies");
      const currencies = Object.entries(response.data).map(([code, details]) => ({
        ...details,
        code,
      }));
      this.setCache(cacheKey, currencies);
      return currencies;
    } catch (e) {
      console.error("Failed to get currencies", e);
      throw e;
    }
  }

  async getMe() {
    try {
      const response = await this.api.get("/me");
      return response.data;
    } catch (e) {
      console.error("Failed to get me", e);
      throw e;
    }
  }

  async getBudgets(params: { from?: string; to?: string; page?: number; per_page?: number } = {}) {
    try {
      const response = await this.api.get<Budget[]>("/budgets", { params });
      return response.data.filter((b) => !b.deleted);
    } catch (e) {
      console.error("Failed to get budgets", e);
      throw e;
    }
  }
}

export const toshl = new ToshlClient();
