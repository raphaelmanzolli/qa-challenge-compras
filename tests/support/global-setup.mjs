import { preflight } from '../../scripts/preflight.mjs';
export default async function globalSetup() {
  await preflight();
}
