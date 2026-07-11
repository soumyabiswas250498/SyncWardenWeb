export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}
