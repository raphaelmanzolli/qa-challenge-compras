import { test as base } from '@playwright/test';
import { closeSessions, sessionVideoPolicy } from './evidence.mjs';
import { LoginPage } from '../page-objects/login-page.mjs';
import { CompraPage } from '../page-objects/compra-page.mjs';

// Cada perfil recebe seu próprio contexto, fechado mesmo quando o teste falha.
export const test = base.extend({
  openSession: async ({ browser, video }, use, testInfo) => {
    const contexts = [];
    const recordings = [];
    const { capture } = sessionVideoPolicy(video, testInfo);
    const openSession = async (user, purchase) => {
      const index = contexts.length;
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        locale: 'pt-BR',
        ...(capture
          ? {
              recordVideo: {
                dir: testInfo.outputPath('videos'),
                size: typeof video === 'object' ? video.size : undefined,
              },
            }
          : {}),
      });
      contexts.push(context);
      if (capture) {
        let pageIndex = 0;
        context.on('page', (page) => {
          const recording = page.video();
          if (recording)
            recordings.push({
              context,
              video: recording,
              name: `video-sessao-${index}-${pageIndex++}`,
            });
        });
      }
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.login(user);
      return new CompraPage(page, purchase);
    };
    try {
      await use(openSession);
    } finally {
      await closeSessions(
        contexts,
        testInfo,
        recordings,
        sessionVideoPolicy(video, testInfo).preserve,
      );
    }
  },
});
