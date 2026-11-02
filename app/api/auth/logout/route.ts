import { ok, handleError } from "../../../../lib/http";
import { SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = ok({ loggedOut: true });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return res;
  } catch (err) {
    return handleError(err);
  }
}
