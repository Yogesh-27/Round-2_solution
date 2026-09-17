import type { Request, Response } from 'express';
import { authCookie, signAccessToken } from '../utils/jwt.js';
import { login, register } from '../services/authService.js';
import type { AuthenticatedRequest } from '../types/auth.js';

export async function registerController(req: Request, res: Response) {
  const user = await register({ name: req.body.name, email: req.body.email, password: req.body.password });
  res.cookie(authCookie.name, signAccessToken(user), authCookie.options);
  res.status(201).json({ user });
}

export async function loginController(req: Request, res: Response) {
  const user = await login(req.body);
  res.cookie(authCookie.name, signAccessToken(user), authCookie.options);
  res.json({ user });
}

export function meController(req: AuthenticatedRequest, res: Response) {
  res.json({ user: req.user });
}

export function logoutController(_req: Request, res: Response) {
  res.clearCookie(authCookie.name, { httpOnly: true, sameSite: authCookie.options.sameSite, secure: authCookie.options.secure, path: authCookie.options.path });
  res.json({ success: true });
}
