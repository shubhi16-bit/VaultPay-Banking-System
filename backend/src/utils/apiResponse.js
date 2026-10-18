/**
 * Standardized API Response Utilities
 * Ensures consistent payload format across all VaultPay REST endpoints
 */

export class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data = null, message = 'Resource created successfully') {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(res, message = 'An error occurred', statusCode = 400, errors = null) {
    const payload = {
      success: false,
      message,
    };

    if (errors) {
      payload.errors = errors;
    }

    return res.status(statusCode).json(payload);
  }

  static paginated(res, items, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data: {
        items,
        pagination,
      },
    });
  }
}
