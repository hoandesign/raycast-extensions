import axios, { AxiosInstance } from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  Transaction,
  Category,
  Tag,
  TransactionInput,
  TransferInput,
  Account,
  Currency,
  Budget,
  Planning,
} from "./types";

const BASE_URL = "https://api.toshl.com";

// Cache TTL in milliseconds (14 days) - used as fallback when no HTTP cache headers
const CACHE_TTL = 14 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  lastModified?: string;
}

class ToshlClient {
  private api: AxiosInstance;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor() {
    const { apiKey, forceRefreshCache } = getPreferenceValues();

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

  private getCacheEntry(key: string): CacheEntry<unknown> | undefined {
    return this.cache.get(key);
  }

  private setCache<T>(key: string, data: T, etag?: string, lastModified?: string): void {
    this.cache.set(key, { data, timestamp: Date.now(), etag, lastModified });
  }

  /**
   * Fetch with HTTP conditional caching using ETag and Last-Modified headers.
   * Per Toshl API docs, 304 responses don't count against rate limits.
   */
  private async fetchWithCache<T>(
    cacheKey: string,
    endpoint: string,
    params: Record<string, unknown> = {},
    transform?: (data: unknown) => T,
  ): Promise<T> {
    const cached = this.getCacheEntry(cacheKey);

    // Build conditional request headers
    const headers: Record<string, string> = {};
    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }
    if (cached?.lastModified) {
      headers["If-Modified-Since"] = cached.lastModified;
    }

    try {
      const response = await this.api.get(endpoint, { params, headers });

      // Extract cache headers from response
      const etag = response.headers["etag"] as string | undefined;
      const lastModified = response.headers["last-modified"] as string | undefined;

      // Transform data if needed
      const data = transform ? transform(response.data) : (response.data as T);

      // Store in cache with HTTP headers
      this.setCache(cacheKey, data, etag, lastModified);
      return data;
    } catch (error) {
      // Check for 304 Not Modified - return cached data
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 304 && cached) {
        // Update timestamp to extend local cache validity
        this.setCache(cacheKey, cached.data as T, cached.etag, cached.lastModified);
        return cached.data as T;
      }

      // If we have valid cached data (within TTL), return it on other errors
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.warn(`Using cached data for ${cacheKey} due to API error`);
        return cached.data as T;
      }

      throw error;
    }
  }

  async getCategories(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    try {
      return await this.fetchWithCache<Category[]>("categories", "/categories", params, (data) =>
        (data as Category[]).filter((c) => !c.deleted),
      );
    } catch (e) {
      console.error("Failed to get categories", e);
      throw e;
    }
  }

  async getTags(params: { page?: number; per_page?: number } = { per_page: 500 }) {
    try {
      return await this.fetchWithCache<Tag[]>("tags", "/tags", params, (data) =>
        (data as Tag[]).filter((t) => !t.deleted),
      );
    } catch (e) {
      console.error("Failed to get tags", e);
      throw e;
    }
  }

  async getAccounts(params: { page?: number; per_page?: number } = { per_page: 100 }) {
    try {
      return await this.fetchWithCache<Account[]>("accounts", "/accounts", params, (data) =>
        (data as Account[]).sort((a, b) => a.order - b.order),
      );
    } catch (e) {
      console.error("Failed to get accounts", e);
      throw e;
    }
  }

  async getCurrencies() {
    try {
      return await this.fetchWithCache<Currency[]>("currencies", "/currencies", {}, (data) => {
        const currencyMap = data as { [key: string]: Omit<Currency, "code"> };
        return Object.entries(currencyMap).map(([code, details]) => ({
          ...details,
          code,
        }));
      });
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

  async getDefaultCurrency(): Promise<string> {
    const cacheKey = "defaultCurrency";
    const cached = this.getCacheEntry(cacheKey);
    if (cached) return cached.data as string;

    try {
      const me = await this.getMe();
      const currency = me?.currency?.main || "USD";
      this.setCache(cacheKey, currency);
      return currency;
    } catch (e) {
      console.error("Failed to get default currency", e);
      return "USD"; // Fallback
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

  async getPlanning(params: { from: string; to: string }) {
    try {
      const response = await this.api.get<Planning>("/planning", { params });
      return response.data;
    } catch (e) {
      console.error("Failed to get planning", e);
      throw e;
    }
  }
}

export const toshl = new ToshlClient();
