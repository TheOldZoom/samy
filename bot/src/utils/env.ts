export function CheckEnvs(envs: string[]) {
  const missing = envs.filter((env) => !process.env[env]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}
