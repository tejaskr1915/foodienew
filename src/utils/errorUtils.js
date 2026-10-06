export const extractApiErrorMessage = (err, fallbackMsg = 'An error occurred. Please try again.') => {
  if (!err) return fallbackMsg;
  if (typeof err === 'string') return err;

  const data = err.response?.data;
  if (!data) return err.message || fallbackMsg;

  // Handle DRF errors object: e.g. { errors: { field: ["error"] } } or { field: ["error"] }
  const errorsObj = data.errors || data;
  if (typeof errorsObj === 'object' && errorsObj !== null) {
    if (Array.isArray(errorsObj.detail)) return errorsObj.detail.join(', ');
    if (typeof errorsObj.detail === 'string') return errorsObj.detail;
    if (Array.isArray(errorsObj.non_field_errors)) return errorsObj.non_field_errors.join(', ');

    const fieldErrors = [];
    for (const [field, val] of Object.entries(errorsObj)) {
      if (field === 'state' || field === 'status' || field === 'code') continue;
      if (Array.isArray(val)) {
        fieldErrors.push(`${field}: ${val.join(', ')}`);
      } else if (typeof val === 'string') {
        fieldErrors.push(`${field}: ${val}`);
      }
    }
    if (fieldErrors.length > 0) {
      return fieldErrors.join(' | ');
    }
  }

  if (data.state?.description && data.state?.description !== 'The submitted data is invalid.') {
    return data.state.description;
  }

  if (data.message) {
    return data.message;
  }

  return err.message || fallbackMsg;
};

export default extractApiErrorMessage;
