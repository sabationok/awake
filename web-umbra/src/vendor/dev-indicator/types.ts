// TEMP until contracts/ts lands — mirrors contracts/dev-build.schema.json exactly.
// When contracts/ts/index.ts exists, DevIndicator.tsx imports from there and this file is deleted.

export type Stage = 'dev' | 'preview' | 'production';

export interface DevBuildProject {
  id: string;
  name: string;
  variant?: string;
  displayName: string;
}

export interface DevBuildGit {
  branch: string;
  commit: string;
  dirty: boolean;
}

export interface DevBuildRow {
  label: string;
  value: string;
}

export interface DevBuildSdk {
  name: string;
  version: string;
}

export interface DevBuild {
  schemaVersion: 1;
  project: DevBuildProject;
  stage: Stage;
  version: string;
  buildNumber?: string;
  git: DevBuildGit;
  builtAt: string;
  extra?: DevBuildRow[];
  sdks?: DevBuildSdk[];
}
