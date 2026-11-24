import { expect } from '@playwright/test';
import { BasePage } from './base-page.js';
import { BaseElement } from './base-element.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.form = page.locator('#auth-page-form:visible');
    this.login = this.form.locator('[name="USER_LOGIN"]');
    this.password = this.form.locator('[name="USER_PASSWORD"]');
    this.logout = page.locator('a[href*="logout=yes"]');
  }

  async visit() {
    await this.open('/');
    await this.page.locator('a.personal-link:visible').first().click();
    await expect(this.form).toBeVisible();
    await expect(this.password).toHaveAttribute('type','password');
    await expect(this.form.locator('input[name="USER_REMEMBER"]')).not.toBeChecked();
    await expect(this.form.locator('a.forgot')).toBeVisible();
    await expect(this.form.locator('a.register')).toBeVisible();
  }

  async submit(login,password) {
    await new BaseElement(this.login, 'Логин').fill(login);
    await new BaseElement(this.password, 'Пароль').fill(password);
    expect(await this.login.inputValue() === login, 'Форма приняла значение логина').toBe(true);
    expect(await this.password.inputValue() === password, 'Форма приняла значение пароля').toBe(true);
    await this.form.locator('button[type=submit][name=Login1]').click();
  }

  async expectCabinet(expectedLogin) {
    await expect.poll(() => this.logout.count(), {message:'Должна появиться ссылка выхода'}).toBeGreaterThan(0);
    await this.open('/personal/');
    await expect(this.page).toHaveURL(/\/personal\/(?:\?.*)?$/);
    await expect(this.page.locator('h1')).toHaveText(/личный кабинет|персональный раздел|мой кабинет/i);
    await expect(this.page.locator('input[name="USER_PASSWORD"]:visible')).toHaveCount(0);
    await expect.poll(() => this.logout.count()).toBeGreaterThan(0);
    const profileLink = this.page.locator('a[href="/personal/private/"]').first();
    await expect(profileLink).toBeAttached();
    const profile = await this.page.context().newPage();
    try {
      await new BasePage(profile).open(await profileLink.getAttribute('href'));
      await expect(profile).toHaveURL(/\/personal\/private\/(?:\?.*)?$/);
      const email = profile.locator('input[name="EMAIL"]');
      await expect(email).toBeVisible();
      await expect.poll(async () => {
        const actual = (await email.inputValue()).trim().toLowerCase();
        return Boolean(expectedLogin) && actual === expectedLogin.trim().toLowerCase();
      }, { message: 'Email в профиле должен совпасть с логином учебной записи' }).toBe(true);
    } finally {
      await profile.close();
    }
  }

  async expectDenied(example) {
    const generic = this.page.locator('xpath=.//*[normalize-space(text())="Неверный логин или пароль."]').filter({visible:true});
    if (example.error === 'server') {
      await expect(generic).toBeVisible();
    } else if (example.error === 'spaces') {
      const required = this.form.locator('label.error:visible').filter({visible:true});
      await expect(generic.or(required).first()).toBeVisible();
    } else {
      for (const [field,id] of [['login','USER_LOGIN_POPUP'],['password','USER_PASSWORD_POPUP']]) {
        const error = this.form.locator('label.error[for="' + id + '"]');
        if (example.fields.includes(field)) {
          await expect(error).toBeVisible();
          await expect(error).toHaveText('Заполните это поле');
        } else {
          await expect(error).toBeHidden();
        }
      }
    }
    await expect(this.form).toBeVisible();
    await this.open('/personal/');
    await expect(this.page.locator('input[name="USER_PASSWORD"]:visible')).toBeVisible();
    await expect(this.logout).toHaveCount(0);
  }
}
