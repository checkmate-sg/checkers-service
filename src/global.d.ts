// src/global.d.ts
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: any;
  // add more fields as needed
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
