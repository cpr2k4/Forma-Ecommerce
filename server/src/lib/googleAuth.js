import { OAuth2Client } from 'google-auth-library';
import { AppError } from '../middleware/errorHandler.js';

let client;

function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId.includes('REPLACE')) {
    throw new AppError(
      'Google sign-in is not configured. Add GOOGLE_CLIENT_ID to server/.env',
      503
    );
  }
  if (!client) client = new OAuth2Client(clientId);
  return client;
}

/**
 * Verifies a Google Identity Services ID token and returns the trusted payload.
 * Throws AppError(401) if the token is invalid, expired, or unverified.
 */
export async function verifyGoogleIdToken(idToken) {
  const oauthClient = getClient();

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError('Invalid Google credential', 401);
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError('Google account has no email', 401);
  }
  if (!payload.email_verified) {
    throw new AppError('Google email is not verified', 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    fullName: payload.name || payload.email.split('@')[0],
    avatarUrl: payload.picture || null,
  };
}
