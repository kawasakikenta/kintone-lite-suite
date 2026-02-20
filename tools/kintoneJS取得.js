(async () => {
  // JSZipの読み込み
  if (typeof JSZip === "undefined") {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const zip = new JSZip();
  const failedApps403 = [];

  // ✅ fileKey から Blob を取得（ゲストスペース対応＋403対応）
  const downloadFileBlob = async (fileKey, guestSpaceId = null, appInfo = '') => {
    try {
      const url = guestSpaceId
        ? `/k/guest/${guestSpaceId}/v1/file.json?fileKey=${fileKey}`
        : `/k/v1/file.json?fileKey=${fileKey}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (res.status === 403) {
        console.warn(`🚫 ファイルダウンロード403: ${fileKey} (${appInfo})`);
        return null;
      }

      return await res.blob();
    } catch (e) {
      console.error(`❌ ファイル取得失敗: ${fileKey}`, e);
      return null;
    }
  };

  // ✅ 全アプリ取得
  const getAllApps = async () => {
    let apps = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const res = await kintone.api('/k/v1/apps.json', 'GET', { offset, limit });
      apps = apps.concat(res.apps);
      if (res.apps.length < limit) break;
      offset += limit;
      await delay(200);
    }
    return apps;
  };

  // ✅ カスタマイズ取得（ゲストスペースにリトライ＋403検知）
  const getAppCustomizeWithRetry = async (appId, spaceId, appName) => {
    try {
      return await kintone.api('/k/v1/app/customize.json', 'GET', { app: appId });
    } catch (e) {
      if (
        e.message &&
        typeof e.message === 'string' &&
        e.message.includes('ゲストスペース内のアプリを操作する場合')
      ) {
        const guestSpaceId = spaceId ? parseInt(spaceId, 10) : null;
        if (!guestSpaceId) {
          console.warn(`❌ ゲストスペースIDが取得できません (App ID: ${appId})`);
          return null;
        }
        try {
          const guestUrl = `/k/guest/${guestSpaceId}/v1/app/customize.json`;
          return await kintone.api(guestUrl, 'GET', { app: appId });
        } catch (retryErr) {
          if (retryErr.code === 'CB_NO02' || retryErr.code === 'CB_NO03' || retryErr.status === 403) {
            console.warn(`🚫 カスタマイズ403: ${appName} (App ID: ${appId})`);
            failedApps403.push({ appId, appName, guestSpaceId });
            return null;
          }
          console.warn(`❌ ゲストスペースリトライ失敗 (App ID: ${appId})`, retryErr);
          return null;
        }
      } else if (e.status === 403) {
        console.warn(`🚫 カスタマイズ403: ${appName} (App ID: ${appId})`);
        failedApps403.push({ appId, appName, guestSpaceId: null });
        return null;
      } else {
        console.warn(`❌ カスタマイズ取得失敗 (App ID: ${appId})`, e);
        return null;
      }
    }
  };

  const apps = await getAllApps();
  console.log(`📦 全アプリ数: ${apps.length}`);

  // 重複排除
  const seen = new Set();
  const uniqueApps = apps.filter(app => {
    const key = `${app.appId}_${app.spaceId || 'null'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const app of uniqueApps) {
    const { appId, name, spaceId } = app;
    const guestSpaceId = spaceId ? parseInt(spaceId, 10) : null;

    const customize = await getAppCustomizeWithRetry(appId, spaceId, name);
    if (!customize) continue;

    const files = [...(customize.desktop.js || []), ...(customize.mobile.js || [])];
    const fileTargets = files.filter(f => f.type === "FILE");

    if (fileTargets.length === 0) continue;

    const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    const folderName = guestSpaceId
      ? `guest${guestSpaceId}_${appId}_${safeName}`
      : `${appId}_${safeName}`;
    const appFolder = zip.folder(folderName);

    for (const file of fileTargets) {
      const blob = await downloadFileBlob(file.file.fileKey, guestSpaceId, `${folderName}/${file.file.name}`);
      if (blob) {
        appFolder.file(file.file.name, blob);
        console.log(`📁 ${folderName}/${file.file.name}`);
      }
    }

    await delay(100);
  }

  if (Object.keys(zip.files).length === 0) {
    console.log("📭 対象ファイルが見つかりませんでした");
    return;
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(zipBlob);
  a.download = "customize_scripts.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  console.log("✅ ダウンロード完了: customize_scripts.zip");

  // 🚨 403エラーが出たアプリを表示
  if (failedApps403.length > 0) {
    console.warn("🚫 アクセス拒否されたアプリ一覧（403）:");
    console.table(failedApps403);
  } else {
    console.log("🟢 すべてのアプリにアクセス成功！");
  }
})();
