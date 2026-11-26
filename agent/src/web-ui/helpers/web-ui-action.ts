import type { UiAction } from '@awake/contracts';
import { WEB_UI_MODULE } from '../constants/web-ui';

export const webUiAction = (name: string, params: Record<string, string | number | boolean>): UiAction => ({ module: WEB_UI_MODULE, name, params });
