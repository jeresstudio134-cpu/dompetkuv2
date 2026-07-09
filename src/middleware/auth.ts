import { Request, Response, NextFunction } from "express";
import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Completely bypass token verification to remove login features
  req.user = {
    uid: "default_user",
    email: "user@example.com",
    authTime: 0,
    firebase: { signInProvider: "custom", sign_in_provider: "custom", identities: {} },
    iss: "custom",
    sub: "default_user",
    aud: "custom",
    exp: 0,
    iat: 0,
  } as any;
  next();
};
