import { parse, serialize } from 'cookie';
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_ID_COOKIE_KEY = 'graphql-education.sid';
const SESSION_SIGN_SECRET = '🤫';

/**
 * Extracts the session ID from the provided `Cookie` header and validates
 * its signature using HMAC.
 */
export function sessionIdFromCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return null;
  }
  const { [SESSION_ID_COOKIE_KEY]: sessionId } = parse(cookieHeader);
  if (!sessionId) {
    return null;
  }
  return validateSignature(sessionId, SESSION_SIGN_SECRET);
}

/**
 * Serialises and signs the session ID using HMAC that can be directly used in the
 * `Set-Cookie` header.
 */
export function sessionIdToCookie(sessionId: string) {
  return serialize(
    SESSION_ID_COOKIE_KEY,
    sign(sessionId, SESSION_SIGN_SECRET),
    {
      httpOnly: true, // cannot be accessed through JavaScript by browsers
      sameSite: 'lax', // sent from same website and when navigating to the website
      maxAge: 10 * 60, // 10 minutes
      // make sure to use secure cookies when serving over HTTPS
      // secure: true,
    },
  );
}

/**
 * Validate the cookie signature message and return the signed value.
 * Returns `null` if invalid.
 *
 * Reference: https://github.com/tj/node-cookie-signature/blob/7deca8b38110a3bd65841c34359794706cc7c60f/index.js#L36-L47
 */
function validateSignature(signed: string, secret: string): string | null {
  const signedBuf = Buffer.from(signed),
    // signed message is in format "<value>.<signature>", take the value
    tentativeVal = signed.slice(0, signed.lastIndexOf('.')),
    // sign the tentative value again to compare
    resignedValBuf = Buffer.from(sign(tentativeVal, secret));

  // valid if resigned message is equal to the original signed message compared with
  // an algorithm sutable for HMAC digests (which is what we use for signing)
  return resignedValBuf.length === signedBuf.length &&
    timingSafeEqual(resignedValBuf, signedBuf)
    ? tentativeVal
    : null;
}

/**
 * Sign the cookie by calculating the HMAC digest in base64
 * and returning the message in format "<value>.<signature>".
 *
 * Reference: https://github.com/tj/node-cookie-signature/blob/7deca8b38110a3bd65841c34359794706cc7c60f/index.js#L16-L24
 */
function sign(value: string, secret: string): string {
  return (
    value +
    '.' +
    createHmac('sha256', secret)
      .update(value)
      .digest('base64')
      .replace(/\=+$/, '') // strip equal signs
  );
}
