import { expect } from '@playwright/test';
import { password } from '../support/settings.mjs';

export class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.getByLabel(/login|usuário/i).waitFor();
  }

  async login(user) {
    await this.page.getByLabel(/login|usuário/i).fill(user);
    await this.page.getByLabel(/senha/i).fill(password());
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/login') && response.request().method() === 'POST',
    );
    await this.page.getByRole('button', { name: /entrar|acessar/i }).click();
    expect((await responsePromise).status(), `Login de ${user}`).toBe(200);
    await expect(this.page).toHaveURL(/\/compras\/?$/);
  }
}
