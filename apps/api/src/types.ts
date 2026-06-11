/** Variabel context Hono yang di-inject requireAuth. */
export type AppEnv = {
  Variables: {
    userId: string;
    agencyId: string | null;
    role: string;
    userName: string;
    userEmail: string;
  };
};
