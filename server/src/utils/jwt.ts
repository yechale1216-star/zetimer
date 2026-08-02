import jwt from 'jsonwebtoken';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SecurityError] JWT_SECRET environment variable is missing in production!');
    }
    return 'zetime-secret-key-2024-secure-and-long-enough';
  }
  return secret;
};

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  schoolId: string;
  customSchoolId?: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
};

