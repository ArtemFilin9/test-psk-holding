import { test } from '../core/fixtures.js';
import { account, negativeExamples } from '../core/data.js';
import { LoginPage } from '../ui/login-page.js';

test.describe('Авторизация ПСК', () => {
  test('ТК-А-01 · Вход с корректными данными', async ({page,journal}) => {
    test.skip(!account.login || !account.password, 'Нужны данные учебной записи ПСК');
    await journal.parameters({ 'Идентификатор': 'Email', 'Логин': 'Зарегистрированный', 'Пароль': 'Действующий', 'Ожидается': 'Кабинет указанного пользователя' });
    const login = new LoginPage(page);
    await journal.step('Открыть окно входа в шапке сайта', () => login.visit());
    await journal.step('Отправить действующие логин и пароль', () => login.submit(account.login,account.password));
    await journal.step('Сверить email в профиле с логином учебной записи', () => login.expectCabinet(account.login));
    await journal.screenshot('Личный кабинет после успешного входа');
  });

  for (const example of negativeExamples()) {
    test(example.id + ' · ' + example.title, async ({page,journal}) => {
      await journal.parameters(example.parameters);
      test.skip(example.needsCredentials && (!account.login || !account.password), 'Нужна действующая учебная запись');
      const login = new LoginPage(page);
      await journal.step('Открыть окно входа в чистой сессии', () => login.visit());
      await journal.step('Отправить данные выбранного класса', () => login.submit(example.login,example.password));
      await journal.step('Проверить сообщение и отсутствие доступа к кабинету', () => login.expectDenied(example));
    });
  }
});
