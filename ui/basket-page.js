import { expect } from '@playwright/test';
import { BasePage, exactText } from './base-page.js';
import { rubles } from './catalog-page.js';

export class BasketPage extends BasePage {
  constructor(page) {
    super(page);
    this.rows = page.locator('tr[data-entity="basket-item"]');
    this.total = page.locator('[data-entity="basket-total-price"]:visible').first();
    this.empty = page.locator('.bx-sbb-empty-cart-text');
  }

  row(name) {
    return this.rows.filter({has: this.page.locator('a[href]').filter({ hasText: exactText(name) })});
  }

  async visit() {
    await this.open('/basket/');
    await this.waitForContents();
  }

  async waitForContents() {
    await expect(this.page.locator('h1')).toHaveText('Корзина');
    await this.rows.first().or(this.empty).filter({visible:true}).first().waitFor();
  }

  async snapshot(name) {
    const row = this.row(name);
    const count = await this.rows.count();
    const quantity = await row.count() ? Number(await row.locator('[data-entity="basket-item-quantity-field"]').inputValue()) : 0;
    return {count, quantity, total: count ? rubles(await this.total.innerText()) : 0};
  }

  async change(name, action) {
    const row = this.row(name);
    await row.hover();
    const [response] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/sale.basket.basket/ajax.php') && r.request().method() === 'POST'),
      row.locator('[data-entity="basket-item-' + action + '"]:visible').first().click()
    ]);
    await response.finished();
    expect(response.ok(), 'Сервер обработал изменение корзины').toBe(true);
  }

  async verify(name, unitPrice, quantity, total) {
    const row = this.row(name);
    await expect(row).toHaveCount(1);
    await expect(row.locator('[data-entity="basket-item-quantity-field"]')).toHaveValue(String(quantity));
    const unit = row.locator('.basket-item-price-current-text');
    const line = row.locator('.basket-item-price-current-value');
    await expect.poll(async () => rubles(await unit.innerText())).toBe(unitPrice);
    await expect.poll(async () => rubles(await line.innerText())).toBe(quantity * unitPrice);
    await expect.poll(async () => rubles(await this.total.innerText())).toBe(total);
    return (await unit.innerText()).replace(/\s+/g, ' ').replace(/\/\s+/g, '/').trim();
  }

  async checkout() {
    const [response] = await Promise.all([
      this.page.waitForResponse(r => r.request().isNavigationRequest() && new URL(r.url()).pathname === '/order/'),
      this.page.locator('button[data-entity="basket-checkout-button"]:visible').first().click()
    ]);
    await this.recoverTemporaryPage(response);
    await expect(this.page).toHaveURL(/\/order\/(?:\?.*)?$/);
  }

  async restore(name, baseline) {
    await this.visit();
    const current = await this.snapshot(name);
    if (current.quantity !== baseline.quantity) {
      expect(current.quantity, 'Можно убрать только одну добавленную тестом единицу').toBe(baseline.quantity + 1);
      await this.change(name, baseline.quantity ? 'quantity-minus' : 'delete');
      await this.visit();
    }
    expect(await this.snapshot(name), 'Исходные количество, число позиций и итог восстановлены').toEqual(baseline);
  }
}
