/** Що агент уже показав власнику: остання збірка і записи змін, про які сказано. */
export interface SeenBuild {
  version: string;
  builtAt: string;
  ids: string[];
}
