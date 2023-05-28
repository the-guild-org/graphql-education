export type ServerContext = {
  sessionId: string | null;
  setSessionId: (sessionId: string) => void;
};
