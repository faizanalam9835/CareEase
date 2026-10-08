import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { Types } from 'mongoose';
import config from '../config/env';

/** Claims this API puts in its tokens. Access tokens carry `tenantId`, refresh tokens `type: 'refresh'`. */
export interface TokenPayload extends JwtPayload {
  userId: string;
  tenantId?: string;
  type?: 'refresh';
}

interface TokenSubject {
  _id: Types.ObjectId | string;
  tenantId: string;
}

/**
 * The access token carries only identity. Roles, department and status are read
 * from the database on every request (see middleware/auth.js) so a permission
 * change takes effect immediately instead of after the token expires.
 */
const generateToken = (user: TokenSubject): string =>
  jwt.sign(
    {
      userId: String(user._id),
      tenantId: user.tenantId
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] }
  );

const generateRefreshToken = (user: Pick<TokenSubject, '_id'>): string =>
  jwt.sign({ userId: String(user._id), type: 'refresh' }, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiresIn as SignOptions['expiresIn']
  });

// We only ever sign object payloads, so verify() never yields a bare string here.
const verifyToken = (token: string): TokenPayload => jwt.verify(token, config.jwtSecret) as TokenPayload;

/**
 * Generates a readable temporary password that still satisfies the policy:
 * one upper, one lower, one digit, one symbol, 10 characters.
 */
const generateTemporaryPassword = (): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&';
  const all = upper + lower + digits + symbols;

  const pick = (pool: string): string => pool[crypto.randomInt(pool.length)];

  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 10) chars.push(pick(all));

  // Fisher-Yates - the old `sort(() => 0.5 - Math.random())` is not a shuffle.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};

const PASSWORD_POLICY =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter and a number.';

const isStrongPassword = (password: unknown): password is string =>
  typeof password === 'string' &&
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password);

export {
  generateToken,
  generateRefreshToken,
  verifyToken,
  generateTemporaryPassword,
  isStrongPassword,
  PASSWORD_POLICY
};
