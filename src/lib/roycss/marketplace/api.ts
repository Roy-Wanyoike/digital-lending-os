/**
 * Marketplace API Client
 * @module roycss/marketplace/api
 * @description API client for marketplace operations
 */

import { 
  MarketplaceItem, 
  MarketplaceFilters, 
  PaginatedResponse,
  Review,
  Collection,
  PublishRequest,
  UserStats 
} from './types';

/** API configuration */
const API_BASE_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || '/api/marketplace';

/** Default headers */
const defaultHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Marketplace API Client class
 */
class MarketplaceAPI {
  private baseUrl: string;
  private authToken: string | null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_BASE_URL;
    this.authToken = null;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get auth headers
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = { ...defaultHeaders };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Search/browse marketplace items
   */
  async searchItems(
    filters: MarketplaceFilters & { page?: number; pageSize?: number } = {}
  ): Promise<PaginatedResponse<MarketplaceItem>> {
    const params = new URLSearchParams();
    
    if (filters.query) params.set('q', filters.query);
    if (filters.type) params.set('type', filters.type);
    if (filters.category) params.set('category', filters.category);
    if (filters.tags?.length) params.set('tags', filters.join(','));
    if (filters.priceRange) params.set('price', `${filters.priceRange[0]}-${filters.priceRange[1]}`);
    if (filters.rating) params.set('minRating', String(filters.rating));
    if (filters.sortBy) params.set('sort', filters.sortBy);
    if (filters.author) params.set('author', filters.author);
    params.set('page', String(filters.page || 1));
    params.set('pageSize', String(filters.pageSize || 20));

    return this.request<PaginatedResponse<MarketplaceItem>>(`/items?${params.toString()}`);
  }

  /**
   * Get item by ID or slug
   */
  async getItem(idOrSlug: string): Promise<MarketplaceItem & { reviews?: Review[] }> {
    return this.request(`/items/${idOrSlug}`);
  }

  /**
   * Get featured items
   */
  async getFeaturedItems(limit: number = 6): Promise<MarketplaceItem[]> {
    return this.request(`/items/featured?limit=${limit}`);
  }

  /**
   * Get popular items
   */
  async getPopularItems(limit: number = 10): Promise<MarketplaceItem[]> {
    return this.request(`/items/popular?limit=${limit}`);
  }

  /**
   * Get new items
   */
  async getNewItems(limit: number = 10): Promise<MarketplaceItem[]> {
    return this.request(`/items/new?limit=${limit}`);
  }

  /**
   * Get items by author
   */
  async getItemsByAuthor(authorId: string): Promise<MarketplaceItem[]> {
    return this.request(`/items?author=${authorId}`);
  }

  /**
   * Get related items
   */
  async getRelatedItems(itemId: string, limit: number = 4): Promise<MarketplaceItem[]> {
    return this.request(`/items/${itemId}/related?limit=${limit}`);
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<Array<{ id: string; name: string; count: number }>> {
    return this.request('/categories');
  }

  /**
   * Get collections
   */
  async getCollections(): Promise<Collection[]> {
    return this.request('/collections');
  }

  /**
   * Get collection by ID
   */
  async getCollection(collectionId: string): Promise<Collection & { items: MarketplaceItem[] }> {
    return this.request(`/collections/${collectionId}`);
  }

  /**
   * Post a review
   */
  async postReview(itemId: string, review: { rating: number; title?: string; content: string }): Promise<Review> {
    return this.request(`/items/${itemId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review)
    });
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: string): Promise<UserStats> {
    return this.request(`/users/${userId}/stats`);
  }

  /**
   * Publish new item
   */
  async publishItem(data: PublishRequest): Promise<MarketplaceItem> {
    return this.request('/items/publish', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Update existing item
   */
  async updateItem(itemId: string, data: Partial<PublishRequest>): Promise<MarketplaceItem> {
    return this.request(`/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: string): Promise<void> {
    return this.request(`/items/${itemId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Download item files
   */
  async downloadItem(itemId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/items/${itemId}/download`, {
      headers: this.getHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    return response.blob();
  }
}

// Export singleton instance
export const marketplaceAPI = new MarketplaceAPI();

export default MarketplaceAPI;
