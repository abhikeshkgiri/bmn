const DATABASE_UNAVAILABLE_ERROR_NAMES = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoTimeoutError',
  'MongoTopologyClosedError',
  'MongoNotConnectedError',
]);

export function isDatabaseUnavailableError(error: unknown): boolean {
  return error instanceof Error && DATABASE_UNAVAILABLE_ERROR_NAMES.has(error.name);
}
