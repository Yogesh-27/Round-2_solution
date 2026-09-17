export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;
  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'Authentication is required.'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'You are not allowed to perform this action.'),
  memberNotFound: () => new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found.'),
  rewardNotFound: () => new AppError(404, 'REWARD_NOT_FOUND', 'Reward not found.'),
  rewardInactive: () => new AppError(409, 'REWARD_INACTIVE', 'This reward is no longer active.'),
  insufficientPoints: () => new AppError(409, 'INSUFFICIENT_POINTS', 'Member does not have enough points for this reward.'),
  duplicatePhone: () => new AppError(409, 'DUPLICATE_PHONE', 'A member with this phone number already exists.'),
  duplicateEmail: () => new AppError(409, 'DUPLICATE_EMAIL', 'An account with this email already exists.'),
  invalidCredentials: () => new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'),
  duplicateRequest: () => new AppError(409, 'DUPLICATE_REQUEST', 'This request has already been processed.')
};
