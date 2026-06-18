import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

const getUserFriendlyMessage = (error: HttpErrorResponse): string => {
  if (error.status === 0) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error.status === 400) {
    return 'Invalid request. Please check your input and try again.';
  }

  if (error.status === 401) {
    return 'You are not authenticated. Please log in and try again.';
  }

  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error.status === 409) {
    return 'There was a conflict with the existing data. Please refresh and try again.';
  }

  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }

  return error.error?.message || 'An unexpected error occurred. Please try again.';
};

const logError = (error: HttpErrorResponse): void => {
  const errorDetails = {
    status: error.status,
    statusText: error.statusText,
    url: error.url,
    timestamp: new Date().toISOString(),
    message: error.message,
    error: error.error,
  };

  console.error('[HTTP Error]', errorDetails);
};

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      logError(error);

      const userFriendlyMessage = getUserFriendlyMessage(error);

      return throwError(() => ({
        status: error.status,
        statusText: error.statusText,
        message: userFriendlyMessage,
        originalError: error,
      }));
    })
  );
};

