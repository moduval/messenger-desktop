export class ErrorUtils {
  static isAbortedError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const err = error as Record<string, unknown>;
    return err.code === 'ERR_ABORTED' || err.errno === -3;
  }

  static isOfflineError(errorCode: number): boolean {
    return errorCode === -106; // ERR_INTERNET_DISCONNECTED
  }
}
