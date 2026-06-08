import jwt from 'jsonwebtoken';

/**
 * Verify the JWT token from the Authorization header.
 * @param {import('http').IncomingMessage} req
 * @returns {{ userId: string, email: string }} - decoded token payload
 * @throws {Error} if token is missing or invalid
 */
export function verifyToken(req) {
  const auth =
    req.headers.authorization ||
    req.headers.Authorization ||
    '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('No token provided');
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Set CORS headers on the response.
 * @param {import('http').ServerResponse} res
 */
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

/**
 * Generate a signed JWT token for a user.
 * @param {{ id: string, email: string }} user
 * @returns {string}
 */
export function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}
