const TEST_DATABASE_NAME = 'bookmynai_dev';
const TEST_DATABASE_HOST = 'abhikesh.j2trfup.mongodb.net';

export function assertIsolatedTestDatabase(
  env: Record<string, string | undefined> = process.env,
): void {
  if (env.BOOKMYNAI_TEST_DB !== TEST_DATABASE_NAME) {
    throw new Error(
      `Refusing database test: BOOKMYNAI_TEST_DB must be ${TEST_DATABASE_NAME}.`,
    );
  }

  if (!env.MONGODB_URI) {
    throw new Error('Refusing database test: MONGODB_URI is not configured.');
  }

  let uri: URL;
  try {
    uri = new URL(env.MONGODB_URI);
  } catch {
    throw new Error('Refusing database test: MONGODB_URI is invalid.');
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
  } catch {
    throw new Error('Refusing database test: MONGODB_URI has an invalid database path.');
  }
  if (databaseName === 'abhikesh_db') {
    throw new Error('Refusing database test: abhikesh_db is not an isolated test database.');
  }

  if (
    uri.protocol !== 'mongodb+srv:' ||
    uri.hostname !== TEST_DATABASE_HOST ||
    databaseName !== TEST_DATABASE_NAME
  ) {
    throw new Error(
      `Refusing database test: URI must target ${TEST_DATABASE_NAME} on the approved development cluster.`,
    );
  }
}
