// Toast Helper Functions
// Safely display API responses in toast notifications

import toast from 'react-hot-toast';

/**
 * Display error from API response
 * Handles both old and new error formats
 * 
 * @param {Object|string} error - Error from API response
 * @param {string} fallback - Fallback message if error is empty
 */
export function showError(error, fallback = 'An error occurred') {
  if (!error) {
    toast.error(fallback);
    return;
  }

  // If it's already a string, use it
  if (typeof error === 'string') {
    toast.error(error);
    return;
  }

  // New standardized format: { message, code, details }
  if (error.message) {
    toast.error(error.message);
    return;
  }

  // Old format: just { error: "message" }
  if (error.error) {
    // Check if error.error is also an object
    if (typeof error.error === 'object' && error.error.message) {
      toast.error(error.error.message);
    } else {
      toast.error(error.error);
    }
    return;
  }

  // Fallback
  toast.error(fallback);
}

/**
 * Display success message from API response
 * @param {Object|string} response - Response from API
 * @param {string} fallback - Fallback message
 */
export function showSuccess(response, fallback = 'Success!') {
  if (!response) {
    toast.success(fallback);
    return;
  }

  if (typeof response === 'string') {
    toast.success(response);
    return;
  }

  if (response.message) {
    toast.success(response.message);
    return;
  }

  toast.success(fallback);
}

/**
 * Handle API response and show appropriate toast
 * @param {Response} response - Fetch response object
 * @param {string} successMessage - Message to show on success
 * @param {string} errorFallback - Fallback error message
 */
export async function handleApiResponse(response, successMessage, errorFallback) {
  const data = await response.json();

  if (response.ok && data.success) {
    showSuccess(data, successMessage);
    return { success: true, data };
  } else {
    showError(data.error || data, errorFallback);
    return { success: false, error: data.error || data };
  }
}

export default {
  showError,
  showSuccess,
  handleApiResponse,
};

