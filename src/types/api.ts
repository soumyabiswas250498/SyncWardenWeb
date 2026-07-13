export interface ApiSuccessResponse<T = undefined> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  /** Machine-readable error code, e.g. DEVICE_LIMIT_REACHED, DPOP_INVALID. */
  code?: string;
  errors?: unknown;
}
