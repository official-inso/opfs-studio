export type Region = "ru" | "global";

export interface Provider {
  id: string;
  title: string;
  subtitle?: string;
  region: Region | "both";
  url: string;
  qrAsset?: string;
}

export interface DonateConfig {
  defaultRegion: Region;
  providers: Provider[];
}

export const donateConfig: DonateConfig = {
  defaultRegion: "global",
  providers: [
    // --- Russia-first options ---
    // {
    //   id: "sbp",
    //   title: "СБП (QR/Link)",
    //   subtitle: "Быстро и без комиссии внутри РФ",
    //   region: "ru",
    //   url: "https://your-sbp-link.example",
    //   qrAsset: "/assets/sbp-qr.png",
    // },
    {
      id: "yoomoney",
      title: "ЮMoney",
      subtitle: "Перевод на кошелёк",
      region: "ru",
      url: "https://yoomoney.ru/to/4100119306774832",
    },
    {
      id: "donationalerts",
      title: "DonationAlerts",
      subtitle: "Донаты для стримеров/создателей",
      region: "ru",
      url: "https://www.donationalerts.com/c/poma098",
    },
    {
      id: "boosty",
      title: "Boosty",
      subtitle: "Подписки и донаты",
      region: "ru",
      url: "https://boosty.to/poma098/donate",
    },

    // --- Global options ---
    {
      id: "donationalerts",
      title: "DonationAlerts",
      subtitle: "Donates for streamers/creators",
      region: "global",
      url: "https://www.donationalerts.com/c/poma098",
    },
    // {
    //   id: "stripe",
    //   title: "Stripe",
    //   subtitle: "Card / Apple Pay / Google Pay",
    //   region: "global",
    //   url: "https://buy.stripe.com/your-payment-link",
    // },
    // {
    //   id: "paypal",
    //   title: "PayPal",
    //   subtitle: "PayPal balance / cards",
    //   region: "global",
    //   url: "https://paypal.me/yourname",
    // },
    // {
    //   id: "kofi",
    //   title: "Ko-fi",
    //   subtitle: "One-time or monthly",
    //   region: "global",
    //   url: "https://ko-fi.com/yourname",
    // },
    // {
    //   id: "bmac",
    //   title: "Buy Me a Coffee",
    //   subtitle: "Card / Apple Pay / Google Pay",
    //   region: "global",
    //   url: "https://www.buymeacoffee.com/yourname",
    // },
  ],
};
