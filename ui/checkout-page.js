import { expect } from '@playwright/test';
import { BasePage } from './base-page.js';
import { BaseElement } from './base-element.js';
import { rubles } from './catalog-page.js';

export class CheckoutPage extends BasePage {
  constructor(page) {
    super(page);
    this.customer = page.locator('#bx-soa-properties');
    this.delivery = page.locator('#bx-soa-delivery');
    this.summary = page.locator('#bx-soa-total');
    this.submitOrder = this.summary.locator('a.btn-order-save:visible').filter({visible:true}).first();
  }

  async enterBuyer(buyer) {
    await expect(this.page.locator('h1')).toHaveText('Оформление заказа');
    const name = this.customer.locator('#soa-property-1');
    const edit = this.customer.locator('xpath=.//*[normalize-space(text())="Изменить"]').filter({ visible: true });
    await name.or(edit).filter({visible:true}).first().waitFor();
    if (!await name.isVisible()) await edit.click();
    await expect(this.customer.locator('[name=PERSON_TYPE][value="1"]')).toBeChecked();
    const email = this.customer.locator('#soa-property-2');
    const phone = this.customer.locator('#soa-property-3');
    await new BaseElement(name, 'Ф.И.О.').fill(buyer.name);
    await new BaseElement(email, 'E-Mail').fill(buyer.email);
    // Маска сайта уже содержит +7. В поле вводятся десять цифр после кода страны.
    await new BaseElement(phone, 'Телефон').fill(buyer.phone.slice(-10));
    await phone.blur();
    expect(await name.inputValue() === buyer.name).toBe(true);
    expect(await email.inputValue() === buyer.email).toBe(true);
    expect((await phone.inputValue()).replace(/\D/g,'').endsWith(buyer.phone.slice(-10))).toBe(true);
    await this.customer.locator('.bx-soa-more-btn:visible').click();
  }

  async selectDelivery(buyer) {
    const next = this.delivery.locator('.bx-soa-more-btn:visible');
    const edit = this.delivery.locator('xpath=.//*[normalize-space(text())="Изменить"]').filter({ visible: true });
    await next.or(edit).filter({visible:true}).first().waitFor();
    if (!await next.isVisible()) await edit.click();
    const option = this.delivery.locator('.bx-soa-pp-company').filter({hasText:'Информация о доставке от ПСК'});
    await option.locator('xpath=.//*[normalize-space(text())="Информация о доставке от ПСК"]').click();
    await expect(option).toHaveClass(/bx-selected/);
    await expect(option).toContainText(/расчет стоимости доставки.*после обработки заказа/i);
    for (const [selector,value,label] of [
      ['#soa-property-7',buyer.address,'Адрес доставки'],
      ['#zipProperty',buyer.postcode,'Индекс'],
      ['#orderDescription',buyer.comment,'Комментарий']
    ]) {
      const field = this.delivery.locator(selector);
      await new BaseElement(field, label).fill(value);
      expect(await field.inputValue() === value).toBe(true);
    }
    await next.click();
    await expect(next).toBeHidden();
  }

  async verifySummary(expected) {
    await expect(this.summary.locator('xpath=.//*[normalize-space(text())="Информация о доставке от ПСК"]')).toBeVisible();
    await expect(this.summary.locator('xpath=.//*[normalize-space(text())="на расчете"]')).toBeVisible();
    await expect(this.summary.locator('xpath=.//*[normalize-space(text())="Наличные"]')).toBeVisible();
    const total = this.summary.locator('xpath=.//span[normalize-space(.)="Итого:"]/following-sibling::span[1]');
    await expect.poll(async () => rubles(await total.innerText())).toBe(expected);
    await expect(this.submitOrder).toBeVisible();
    await expect(this.submitOrder).toHaveText(/Оформить заказ/i);
    await expect(this.submitOrder).toBeEnabled();
    const consent = this.summary.locator('.bx-soa-cart-conditions-text:visible');
    await expect(consent).toContainText(/нажимая на кнопку/i);
    await expect(consent.locator('a[href]').first()).toHaveText(/обработку персональных данных/i);
  }
}
