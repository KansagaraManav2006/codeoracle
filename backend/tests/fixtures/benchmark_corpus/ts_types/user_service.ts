import type { UserProfile, AuthToken } from './types';

export class UserService {
  authenticate(token: AuthToken): boolean {
    return token.length > 0;
  }
}
