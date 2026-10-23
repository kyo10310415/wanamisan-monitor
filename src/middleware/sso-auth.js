import { readSsoConfig } from '../config.js';
import { createSsoAuthMiddleware } from '../sso-access.js';

export const ssoAuthMiddleware = createSsoAuthMiddleware(readSsoConfig(process.env));
