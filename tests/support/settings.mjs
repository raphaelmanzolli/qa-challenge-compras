// Somente o ambiente didático local: impede execução acidental contra terceiros.
export function localBaseURL(value = process.env.BASE_URL || 'http://localhost:8080') {
  const url = new URL(value);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.protocol !== 'http:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('BASE_URL deve ser uma origem HTTP local, ex.: http://localhost:8080');
  }
  return url.origin;
}

export const password = () => process.env.DEMO_PASSWORD || 'DesafioQA@2026';

export function positiveInteger(name, fallback, max = 3600) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} deve ser inteiro entre 1 e ${max}.`);
  }
  return value;
}
