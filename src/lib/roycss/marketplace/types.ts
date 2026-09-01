/**
 * Marketplace Types
 * @module roycss/marketplace/types
 * @description Type definitions for the ROYCSS marketplace
 */

/** Marketplace item types */
export type MarketplaceItemType = 'effect' | 'component' | 'pattern' | 'template' | 'theme' | 'plugin';

/** Item visibility status */
export type ItemVisibility = 'public' | 'private' | 'unlisted';

/** Item review status */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'archived';

/** Marketplace item interface */
export interface MarketplaceItem {
  /** Unique identifier */
  id: string;
  /** Item name */
  name: string;
  /** Item slug (URL-friendly) */
  slug: string;
  /** Item description (short) */
  description: string;
  /** Full description (markdown) */
  longDescription?: string;
  /** Item type */
  type: MarketplaceItemType;
  /** Author information */
  author: AuthorInfo;
  /** Version (semver) */
  version: string;
  /** License */
  license: string;
  /** Tags for search */
  tags: string[];
  /** Categories */
  categories: string[];
  /** Preview images/screenshots */
  screenshots: Screenshot[];
  /** Main preview image */
  previewImage?: string;
  /** Download count */
  downloads: number;
  /** View count */
  views: number;
  /** Average rating (0-5) */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Price (null = free) */
  price: number | null;
  /** Currency code */
  currency?: string;
  /** Visibility status */
  visibility: ItemVisibility;
  /** Review status (for admin) */
  reviewStatus?: ReviewStatus;
  /** Dependencies */
  dependencies?: Dependency[];
  /** Compatibility info */
  compatibility: CompatibilityInfo;
  /** Source files URL */
  sourceUrl?: string;
  /** Demo URL */
  demoUrl?: string;
  /** Documentation URL */
  docsUrl?: string;
  /** Repository URL */
  repositoryUrl?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Updated timestamp */
  updatedAt: Date;
  /** Published timestamp */
  publishedAt?: Date;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/** Author information */
export interface AuthorInfo {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  website?: string;
}

/** Screenshot/image */
export interface Screenshot {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

/** Dependency declaration */
export interface Dependency {
  name: string;
  version: string;
  type: 'required' | 'optional' | 'peer';
}

/** Compatibility information */
export interface CompatibilityInfo {
  /** Minimum ROYCSS version */
  minVersion?: string;
  /** Maximum ROYCSS version */
  maxVersion?: string;
  /** Browser support */
  browsers: BrowserSupport;
  /** Framework compatibility */
  frameworks: string[];
}

/** Browser support */
export interface BrowserSupport {
  chrome?: boolean | string;
  firefox?: boolean | string;
  safari?: boolean | string;
  edge?: boolean | string;
  ie?: boolean | string;
  mobile?: boolean;
}

/** Review/rating */
export interface Review {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  createdAt: Date;
  helpful: number;
  verified: boolean;
}

/** Collection of items */
export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  items: string[]; // Item IDs
  authorId: string;
  followers: number;
  createdAt: Date;
}

/** Search filters */
export interface MarketplaceFilters {
  type?: MarketplaceItemType;
  category?: string;
  tags?: string[];
  priceRange?: [number, number];
  rating?: number;
  sortBy?: 'popular' | 'newest' | 'rating' | 'downloads' | 'updated';
  author?: string;
  query?: string;
}

/** Paginated response */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/** Publish request */
export interface PublishRequest {
  name: string;
  description: string;
  longDescription?: string;
  type: MarketplaceItemType;
  license: string;
  tags: string[];
  categories: string[];
  price: number | null;
  sourceFiles: FileMetadata[];
  screenshots: FileMetadata[];
  demoUrl?: string;
  docsUrl?: string;
  repositoryUrl?: string;
  dependencies?: Dependency[];
  compatibility?: Partial<CompatibilityInfo>;
}

/** File metadata */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  url?: string;
}

/** User's marketplace stats */
export interface UserStats {
  publishedItems: number;
  totalDownloads: number;
  totalReviews: number;
  averageRating: number;
  followers: number;
  following: number;
}
