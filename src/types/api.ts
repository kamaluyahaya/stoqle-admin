export interface ApiResponse<T = unknown> {
 success: boolean;
 message?: string;
 data: T;
}

export interface PaginatedResponse<T> {
 success: boolean;
 data: T[];
 total: number;
 page: number;
 limit: number;
 pages: number;
}

export interface ApiError {
 message: string;
 code?: string;
 statusCode?: number;
}
