/** Текст помилки для логу чи відповіді власнику. Токенів конектор сюди не пускає: маскує їх у себе. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
