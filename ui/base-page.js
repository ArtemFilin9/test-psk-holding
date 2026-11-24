export class BasePage {
  constructor(page) { this.page = page; }

  async open(path) {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.recoverTemporaryPage(response);
  }

  async recoverTemporaryPage(response) {
    for (let attempt = 0; attempt < 2 && response; attempt++) {
      if (![502, 503, 504].includes(response.status()) || response.request().method() !== 'GET') return;
      const header = response.headers()['retry-after'];
      const seconds = header ? (/^\d+$/.test(header) ? Number(header) : (Date.parse(header) - Date.now()) / 1000) : 30 * (attempt + 1);
      if (!Number.isFinite(seconds) || seconds > 90) break;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, seconds) * 1000));
      response = await this.page.goto(response.url(), {waitUntil: 'domcontentloaded'});
    }
    if (response && [502, 503, 504].includes(response.status())) {
      throw new Error('Страница временно недоступна. Ответ магазина: HTTP ' + response.status());
    }
  }
}

export function exactText(text) {
  const escaped = text.replace(/[.*+?^$()|[\]\\]/g, '\\$&').trim().split(/\s+/).join('\\s+');
  return new RegExp('^\\s*' + escaped + '\\s*$');
}
