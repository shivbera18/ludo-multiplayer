import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'change-me-local-secret';
const DEFAULT_EXPIRES_IN = '7d';

export function signAuthToken(user) {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRES_IN;

  return jwt.sign(
    {
      sub: String(user.id),
      username: user.username,
      displayName: user.displayName
    },
    secret,
    { expiresIn }
  );
}

export function verifyAuthToken(token) {
  const secret = process.env.JWT_SECRET ?? DEFAULT_SECRET;
  const payload = jwt.verify(token, secret);
  return {
    id: Number(payload.sub),
    username: payload.username,
    displayName: payload.displayName
  };
}

export function extractBearerToken(authorizationValue) {
  if (!authorizationValue || typeof authorizationValue !== 'string') return null;
  if (!authorizationValue.toLowerCase().startsWith('bearer ')) return null;
  return authorizationValue.slice('Bearer '.length).trim();
}
