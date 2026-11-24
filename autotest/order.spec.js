import { fileURLToPath } from 'node:url';
import { test } from '../core/fixtures.js';
import { account, buyer, product } from '../core/data.js';
import { LoginPage } from '../ui/login-page.js';
import { CatalogPage } from '../ui/catalog-page.js';
import { BasketPage } from '../ui/basket-page.js';
import { CheckoutPage } from '../ui/checkout-page.js';

test('ТК-К-02 → ТК-К-16 · От входа до оформления заявки физлица', async ({page,journal}, info) => {
  await info.attach('Тестовые данные', { path: fileURLToPath(new URL('../report/Тестовые данные.pdf', import.meta.url)), contentType: 'application/pdf' });
  await journal.parameters({ 'Товар': product.name, 'Количество': '1', 'Завершение': 'Проверка итоговой формы до отправки' });
  test.skip(!account.login || !account.password, 'Нужна учебная запись ПСК');
  const login = new LoginPage(page);
  const catalog = new CatalogPage(page);
  const cart = new BasketPage(page);
  const order = new CheckoutPage(page);
  await journal.step('Войти в ПСК и сверить email владельца кабинета', async () => {
    await login.visit();
    await login.submit(account.login,account.password);
    await login.expectCabinet(account.login);
  });
  await journal.step('ТК-К-02 · Найти балку для опалубки БДК и открыть BDU', () => catalog.search(product));
  const price = await journal.step('ТК-К-04 · Проверить товар, наличие и цену', () => catalog.readCard());
  journal.log('INFO', 'Цена в карточке: ' + price.display);
  const existing = await catalog.alreadyInBasket();
  const baseline = await journal.step('Запомнить количество балок и исходный итог корзины', async () => {
    if (existing) {
      await catalog.openBasket();
      await cart.waitForContents();
      return cart.snapshot(product.name);
    }
    const tab = await page.context().newPage();
    try {
      const before = new BasketPage(tab);
      await before.visit();
      return await before.snapshot(product.name);
    } finally { await tab.close(); }
  });
  try {
    await journal.step('Добавить одну единицу BDU в корзину', async () => {
      if (existing) {
        await cart.change(product.name,'quantity-plus');
      } else {
        await catalog.addOne();
        await catalog.openBasket();
        await cart.waitForContents();
      }
    });
    const orderTotal = baseline.total + price.amount;
    const unit = await journal.step('Сверить наименование, количество, цену строки и итог корзины', () => cart.verify(product.name, price.amount, baseline.quantity + 1, orderTotal));
    journal.log('INFO', 'Цена единицы в корзине: ' + unit);
    journal.log('INFO', 'Количество после добавления: ' + (baseline.quantity + 1) + '. Сумма корзины: ' + orderTotal + ' ₽');
    await journal.step('ТК-К-15 · Перейти к оформлению заказа', () => cart.checkout());
    await journal.step('ТК-К-16 · Заполнить обязательные поля физлица', () => order.enterBuyer(buyer));
    await journal.step('Выбрать доставку ПСК, заполнить адрес, индекс и комментарий', () => order.selectDelivery(buyer));
    await journal.step('Сверить способ оплаты, условия доставки, сумму и кнопку оформления', () => order.verifySummary(orderTotal));
    journal.log('INFO', 'Итого к оформлению: ' + orderTotal + ' ₽. Доставка на расчете.');
    journal.log('WARNING','Заказ не отправлен.');
    await journal.screenshot('Итог перед отправкой заявки', order.summary);
  } catch (error) {
    await journal.screenshot('Состояние страницы в момент ошибки').catch(() => {});
    throw error;
  } finally {
    await journal.step('Проверить и восстановить исходное состояние корзины', () => cart.restore(product.name,baseline));
  }
});
