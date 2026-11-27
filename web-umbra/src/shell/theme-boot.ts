/** Тема клієнта: спільне для серверного layout (скрипт у <head>) і клієнтської секції «Вигляд». Без 'use client'. */
export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_KEY = 'macontrol:theme';
export const DEFAULT_THEME: ThemeChoice = 'dark';
export const THEME_COLOR = { dark: '#060403', light: '#f4f3f6' } as const;
/** Той самий вибір, що й applyTheme, але рядком: виконується в <head> до гідрації, щоб не блимало. */
export const THEME_BOOT_SCRIPT = `try{var d=document.documentElement,q=new URLSearchParams(location.search),t=q.get('theme')||localStorage.getItem('${THEME_KEY}')||'${DEFAULT_THEME}';if(t==='system')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';d.dataset.theme=t==='light'?'light':'dark';if(q.get('backdrop')==='off')delete d.dataset.backdrop;addEventListener('DOMContentLoaded',function(){var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content',d.dataset.theme==='light'?'${THEME_COLOR.light}':'${THEME_COLOR.dark}')})}catch(e){}`;
