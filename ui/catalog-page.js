import { expect } from '@playwright/test';
import { BasePage, exactText } from './base-page.js';

export function rubles(text) {
  const amount = text.replace(/[\s\u00a0\u202f]/g,'').match(/(\d+(?:[.,]\d+)?)(?:руб|₽)/i);
  if (!amount) throw new Error('На странице не удалось распознать цену в рублях');
  return Number(amount[1].replace(',','.'));
}

export class CatalogPage extends BasePage {
  constructor(page) {
    super(page);
    this.card = page.locator('.catalog_detail');
  }

  async search(product) {
    const search = this.page.locator('form[action="/search/"] input[name="q"]').first();
    await search.fill(product.query);
    const [response] = await Promise.all([
      this.page.waitForResponse(r => r.request().isNavigationRequest() && new URL(r.url()).pathname === '/search/'),
      search.press('Enter')
    ]);
    await this.recoverTemporaryPage(response);
    await expect.poll(() => new URL(this.page.url()).searchParams.get('q')).toBe(product.query);
    const result = this.page.locator('a[href]').filter({ hasText: exactText(product.name) }).filter({ visible: true });
    await expect(result.first()).toBeVisible();
    await result.first().click();
    await expect(this.page.locator('h1')).toHaveText(product.name);
  }

  async readCard() {
    await expect(this.card.locator('.item-stock:visible span.value:visible').last()).toHaveText('В наличии');
    const price = this.card.locator('.cost.detail .price_value:visible').first();
    await expect(price).toBeVisible();
    const display = (await price.innerText()).trim();
    const amount = rubles(display);
    expect(amount).toBeGreaterThan(0);
    return {display, amount};
  }

  async addOne() {
    await this.card.locator('.to-cart.btn-lg:visible').click();
    await expect(this.card.locator('.in-cart.btn-lg:visible').filter({visible:true}).first()).toBeVisible();
  }

  async alreadyInBasket() {
    const add = this.card.locator('.to-cart.btn-lg:visible');
    const added = this.card.locator('.in-cart.btn-lg:visible');
    await add.or(added).first().waitFor();
    return added.isVisible();
  }

  async openBasket() {
    const [response] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname === '/basket/' && r.request().isNavigationRequest()),
      this.card.locator('.in-cart.btn-lg:visible').filter({visible:true}).first().click()
    ]);
    await this.recoverTemporaryPage(response);
    await expect(this.page).toHaveURL(/\/basket\/(?:\?.*)?$/);
  }
}
