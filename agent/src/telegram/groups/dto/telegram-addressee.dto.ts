/** Куди слати в Telegram: чат і, для форуму, топік. */
export class TelegramAddresseeDto {
  chatId!: string;
  threadId?: number;
}
