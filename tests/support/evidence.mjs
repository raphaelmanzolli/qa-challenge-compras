export async function attachJson(testInfo, name, data) {
  await testInfo.attach(name, {
    body: JSON.stringify(data, null, 2),
    contentType: 'application/json',
  });
}

export async function responseEvidence(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return {
    status: response.status(),
    traceId: response.headers()['x-trace-id'],
    body,
  };
}

export function sessionVideoPolicy(video, testInfo) {
  let mode = typeof video === 'string' ? video : video?.mode || 'off';
  if (mode === 'retry-with-video') mode = 'on-first-retry';
  const retry = testInfo.retry || 0;
  const capture =
    mode !== 'off' &&
    (mode !== 'on-first-retry' || retry === 1) &&
    (mode !== 'on-all-retries' || retry > 0) &&
    (mode !== 'retain-on-first-failure' || retry === 0);
  const preserve =
    ['on', 'on-first-retry', 'on-all-retries'].includes(mode) ||
    testInfo.status !== testInfo.expectedStatus ||
    (mode === 'retain-on-failure-and-retries' && retry > 0);
  return { capture, preserve: capture && preserve };
}

export async function closeSessions(contexts, testInfo, recordings = [], preserveVideo = false) {
  const closed = new Set();
  for (const [index, context] of contexts.entries()) {
    try {
      const page = context.pages()[0];
      if (page && !page.isClosed()) {
        await testInfo.attach(`sessao-${index}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      }
    } catch (error) {
      console.warn(`Não foi possível capturar sessão ${index}: ${error.message}`);
    } finally {
      try {
        await context.close();
        closed.add(context);
      } catch (error) {
        console.warn(`Não foi possível fechar sessão ${index}: ${error.message}`);
      }
    }
  }
  // O fechamento finaliza os arquivos. Uma falha não impede anexar os demais vídeos.
  for (const { context, video, name } of recordings) {
    if (!closed.has(context)) continue;
    try {
      if (preserveVideo) {
        const destination = testInfo.outputPath(`${name}.webm`);
        await video.saveAs(destination);
        await testInfo.attach(name, { path: destination, contentType: 'video/webm' });
      }
      await video.delete();
    } catch (error) {
      console.warn(`Não foi possível finalizar vídeo ${name}: ${error.message}`);
    }
  }
}
