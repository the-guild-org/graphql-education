// TODO: use hmac to sign the session id cookie making sure it originated from us

import { parse, serialize } from 'cookie';

const SESSION_ID_COOKIE_KEY = 'graphql-education.sid';

export function sessionIdFromCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return null;
  }
  const { [SESSION_ID_COOKIE_KEY]: sessionId } = parse(cookieHeader);
  return sessionId || null;
}

export function sessionIdToCookie(sessionId: string) {
  return serialize(SESSION_ID_COOKIE_KEY, sessionId, {
    httpOnly: true, // cannot be accessed through JavaScript by browsers
    sameSite: 'lax', // sent from same website and when navigating to the website
    maxAge: 10 * 60, // 10 minutes
    // make sure to use secure cookies when serving over HTTPS
    // secure: true,
  });
}
