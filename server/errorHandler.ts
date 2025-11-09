import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to perform this action") {
    super(403, message, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, true);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, public originalError?: any) {
    super(503, `${service} is temporarily unavailable`, true);
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, public originalError?: any) {
    super(500, `Database ${operation} failed`, false);
  }
}

interface ErrorResponse {
  error: string | {
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

function sanitizeErrorMessage(error: any): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof ZodError) {
    const firstError = error.errors[0];
    return `Validation failed: ${firstError.path.join('.')} - ${firstError.message}`;
  }
  
  if (error.code === '23505') {
    return "A record with this information already exists";
  }
  
  if (error.code === '23503') {
    return "Cannot perform this action due to existing dependencies";
  }
  
  if (error.code === '23502') {
    return "Missing required information";
  }
  
  if (error.code && error.code.startsWith('23')) {
    return "Database constraint violation";
  }
  
  return "An unexpected error occurred";
}

function getStatusCode(error: any): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  
  if (error instanceof ZodError) {
    return 400;
  }
  
  if (error.code === '23505' || error.code === '23503' || error.code === '23502') {
    return 400;
  }
  
  return 500;
}

function getErrorCode(error: any): string | undefined {
  if (error instanceof AppError) {
    return error.constructor.name.replace('Error', '').toUpperCase();
  }
  
  if (error instanceof ZodError) {
    return 'VALIDATION_ERROR';
  }
  
  if (error.code === '23505') return 'DUPLICATE_ENTRY';
  if (error.code === '23503') return 'FOREIGN_KEY_VIOLATION';
  if (error.code === '23502') return 'NOT_NULL_VIOLATION';
  
  return undefined;
}

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = getStatusCode(error);
  const message = sanitizeErrorMessage(error);
  const code = getErrorCode(error);
  const requestId = (req as any).requestId || 'unknown';
  
  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
  
  if (error instanceof AppError && error.isOperational && error.details) {
    (errorResponse.error as any).details = error.details;
  }
  
  if (error instanceof ZodError) {
    (errorResponse.error as any).details = error.errors.map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
  
  const logData = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    errorType: error.constructor.name,
    message: error.message,
    code,
    userId: (req as any).user?.claims?.sub,
    isOperational: error instanceof AppError ? error.isOperational : false,
  };
  
  if (statusCode >= 500) {
    const serverLogData = { ...logData, stack: error.stack };
    
    if (error instanceof DatabaseError && error.originalError) {
      (serverLogData as any).dbError = {
        code: error.originalError.code,
        detail: error.originalError.detail,
      };
    }
    
    if (error instanceof ExternalServiceError && error.originalError) {
      (serverLogData as any).externalError = error.originalError.message;
    }
    
    console.error(JSON.stringify(serverLogData));
  } else {
    console.warn(JSON.stringify(logData));
  }
  
  res.setHeader('X-Request-ID', requestId);
  res.status(statusCode).json(errorResponse);
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
}
