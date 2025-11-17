import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      isAuthenticated?: () => boolean;
      guestUser?: {
        tokenId: string;
        scopes: {
          despacho?: string[];
          inventario?: string[];
        };
      };
    }
  }
}

export {};
