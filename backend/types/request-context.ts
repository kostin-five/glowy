export interface AuthUser {
  id: number;
  channel?: string;
  telegramConnectionId?: number;
  [claim: string]: unknown;
}
