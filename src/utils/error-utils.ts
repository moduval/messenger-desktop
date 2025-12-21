export class ErrorUtils {
  static isAbortedError(error: any): boolean {
    return error?.code === 'ERR_ABORTED' || error?.errno === -3;
  }

  static isOfflineError(errorCode: number): boolean {
    return errorCode === -106; // ERR_INTERNET_DISCONNECTED
  }
}
