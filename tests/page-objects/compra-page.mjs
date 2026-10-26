import { expect } from '@playwright/test';

export class CompraPage {
  constructor(page, purchase) {
    this.page = page;
    this.purchase = purchase;
  }

  get heading() {
    return this.page.getByRole('heading', { level: 1 });
  }

  get estimatedTotal() {
    return this.page
      .getByRole('region', { name: 'Resumo', exact: true })
      .locator('[data-campo="valorTotalEstimado"]');
  }

  get lowestBid() {
    return this.page
      .getByRole('region', { name: 'Painel', exact: true })
      .locator('[data-campo="menorLanceUnitario"]');
  }

  get winner() {
    return this.page.getByTestId('vencedor');
  }

  get confirmation() {
    return this.page.getByRole('dialog');
  }

  async goto() {
    await this.page.goto(`/compras/${this.purchase.id}`);
    await expect(this.heading).toContainText(this.purchase.codigo);
    await this.page.getByRole('region', { name: 'Resumo', exact: true }).waitFor();
  }

  async gotoDispute() {
    await this.page.goto(`/compras/${this.purchase.id}/disputa`);
    await expect(this.heading).toHaveText(`Disputa ${this.purchase.codigo}`);
  }

  async gotoResult() {
    await this.page.goto(`/compras/${this.purchase.id}/resultado`);
    await expect(this.heading).toHaveText(`Resultado ${this.purchase.codigo}`);
  }

  async publish() {
    const response = this.page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/compras/${this.purchase.id}/publicar`) &&
        r.request().method() === 'POST',
    );
    await this.page.getByRole('button', { name: 'Publicar', exact: true }).click();
    return response;
  }

  async sendBid(value) {
    // O label está no Shadow DOM aberto do componente bid-input.
    await this.page.getByLabel('Valor do lance (R$)', { exact: true }).fill(value.toFixed(2));
    const response = this.page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/compras/${this.purchase.id}/lances`) &&
        r.request().method() === 'POST',
    );
    await this.page.getByRole('button', { name: 'Enviar lance', exact: true }).click();
    return response;
  }

  async openConfirmation() {
    await this.page.getByRole('button', { name: 'Homologar', exact: true }).click();
  }

  async confirmHomologation() {
    const response = this.page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/compras/${this.purchase.id}/homologar`) &&
        r.request().method() === 'POST',
    );
    await this.confirmation
      .getByRole('button', { name: 'Confirmar homologação', exact: true })
      .click();
    return response;
  }
}
