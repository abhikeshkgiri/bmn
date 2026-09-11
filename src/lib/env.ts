export function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`PRODUCTION_CONFIG_ERROR: ${name} is not configured`);
  }
  return value;
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  for (const name of ['MONGODB_URI', 'AUTH_SECRET', 'NEXT_PUBLIC_APP_URL', 'OTP_PROVIDER']) {
    requireEnvironmentVariable(name);
  }

  if (process.env.AUTH_DEV_MODE === 'true') {
    throw new Error('PRODUCTION_CONFIG_ERROR: AUTH_DEV_MODE must be false in production');
  }

  if (process.env.OTP_PROVIDER !== 'twilio') {
    throw new Error('PRODUCTION_CONFIG_ERROR: OTP_PROVIDER must be twilio in production');
  }
}
