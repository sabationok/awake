/** Куди веде кнопка: екран свого namespace (`set`; '' — головний) або іншого. */
export interface BotNav {
  namespace?: string;
  screen: string;
}

/**
 * Кнопка екрана: дія з параметрами, перехід на інший екран, або дія з переходом
 * (тоді після дії малюється екран `go`, інакше — той самий).
 */
export interface BotButton {
  label: string;
  action?: string;
  params?: Record<string, string>;
  go?: BotNav;
}

/** Екран: HTML-текст, ряди кнопок і, крім головного, куди веде «← Назад». */
export interface BotMenu {
  text: string;
  buttons: BotButton[][];
  back?: BotNav;
}
