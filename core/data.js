import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export const account = { login: process.env.PSK_LOGIN || '', password: process.env.PSK_PASSWORD || '' };
const defaultBuyer = {
  name: 'Иванов Иван Иванович', email: 'qa-order@example.test', phone: '79001234567',
  address: 'г. Москва, ул. Тестовая, д. 1', postcode: '101000', comment: 'ТЕСТ — не обрабатывать'
};
const defaultProduct = { query: 'Балка для опалубки БДК', name: 'Балка для опалубки БДК "BDU"' };


const source = process.env.QA_DATA_FILE;
const supplied = source ? JSON.parse(readFileSync(source, 'utf8').replace(/^\uFEFF/, '')) : {};
export const product = { ...defaultProduct, ...supplied.product };
export const buyer = { ...defaultBuyer, ...supplied.buyer };

export function negativeExamples() {
  const absent = 'qa-' + randomUUID().slice(0, 12) + '@example.invalid';
  const wrong = 'Wrong!' + randomUUID();
  const valid = account.password;
  const rejected = 'Ошибка авторизации; кабинет закрыт';
  const required = 'Подсказка у пустого поля; кабинет закрыт';
  const sets = [
    {
      id: 'ТК-А-02.1', title: 'Существующий логин и неверный пароль', login: account.login, password: wrong, error: 'server',
      loginClass: 'Зарегистрированный', passwordClass: 'Неверный', expected: rejected
    },
    {
      id: 'ТК-А-02.2', title: 'Несуществующий аккаунт', login: absent, password: valid, error: 'server',
      loginClass: 'Незарегистрированный', passwordClass: 'Действующий', expected: rejected
    },
    {
      id: 'ТК-А-02.3', title: 'Неизвестный логин и неверный пароль', login: absent, password: wrong, error: 'server',
      loginClass: 'Незарегистрированный', passwordClass: 'Неверный', expected: rejected
    },
    {
      id: 'ТК-А-02.Ф', title: 'Email без домена', login: 'student@', password: valid, error: 'server',
      loginClass: 'Без домена', passwordClass: 'Действующий', expected: rejected
    },
    {
      id: 'ТК-А-03.1', title: 'Оба поля пусты', login: '', password: '', fields: ['login', 'password'],
      loginClass: 'Пустой', passwordClass: 'Пустой', expected: 'Подсказки у обоих полей; кабинет закрыт'
    },
    {
      id: 'ТК-А-03.2', title: 'Пустой логин', login: '', password: valid, fields: ['login'],
      loginClass: 'Пустой', passwordClass: 'Действующий', expected: required
    },
    {
      id: 'ТК-А-03.3', title: 'Пустой пароль', login: account.login, password: '', fields: ['password'],
      loginClass: 'Зарегистрированный', passwordClass: 'Пустой', expected: required
    },
    {
      id: 'ТК-А-04.1', title: 'В обоих полях только пробелы', login: '   ', password: '   ', error: 'spaces',
      loginClass: 'Пробелы', passwordClass: 'Пробелы', expected: 'Отказ во входе; кабинет закрыт'
    },
  ];
  return sets.map(example => ({
    ...example,
    needsCredentials: example.loginClass === 'Зарегистрированный' || example.passwordClass === 'Действующий',
    parameters: {
      'Идентификатор': 'Email', 'Логин': example.loginClass,
      'Пароль': example.passwordClass, 'Ожидается': example.expected
    }
  }));
}
