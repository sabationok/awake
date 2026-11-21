/** Відповідь `GET /api/v1/config` Envify, як у `@envify/sdk` (`EnvifyConfig`). */
export interface EnvifyConfig {
  scope: { projectId: string; environmentId: string; serviceId: string };
  variables: Record<string, string>;
  /** `KEY: reason` для посилань `${{…}}`, які Envify не розв'язав. */
  errors: string[];
}
