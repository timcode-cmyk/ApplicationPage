<template>
  <div>
    <header class="page-header">
      <div>
        <p class="eyebrow">Cloudflare Pages 发布页面</p>
        <h1>软件中心</h1>
        <p class="subheading">
          通过 Vue + Vite 动态解析 GitHub Release，展示开发版与正式版程序的版本、更新日志和下载链接。
        </p>
      </div>
      <div class="header-note">
        当前从 GitHub Release 元数据获取，若缺少 macOS/Windows 资产请检查对应仓库 Release 命名。
      </div>
    </header>

    <main>
      <section class="section-block" v-for="category in categories" :key="category.name">
        <div class="section-header">
          <h2>{{ category.name }}</h2>
          <p>{{ category.description }}</p>
        </div>

        <div class="cards-grid">
          <article class="release-card" v-for="app in category.apps" :key="app.repoFullName">
            <div class="card-top">
              <img class="app-logo" :src="app.logoUrl" :alt="app.displayName + ' logo'" />
              <div class="app-title">
                <p class="label">{{ app.displayName }}</p>
                <h3>{{ app.repoFullName }}</h3>
              </div>
            </div>

            <p class="app-description">{{ app.repoDescription || '正在获取仓库简介...' }}</p>

            <div class="card-meta">
              <div>
                <strong>版本</strong>
                <span>{{ app.version || '暂无发布' }}</span>
              </div>
              <div>
                <strong>更新</strong>
                <span>{{ formatDate(app.publishedAt) }}</span>
              </div>
            </div>

            <div class="download-row">
              <a
                v-if="app.downloads.macos"
                :href="app.downloads.macos"
                class="download-button mac"
                target="_blank"
                rel="noreferrer"
              >
                macOS 下载
              </a>
              <button v-else class="download-button disabled">macOS 暂无</button>

              <a
                v-if="app.downloads.windows"
                :href="app.downloads.windows"
                class="download-button windows"
                target="_blank"
                rel="noreferrer"
              >
                Windows 下载
              </a>
              <button v-else class="download-button disabled">Windows 暂无</button>
            </div>

            <details class="changelog-block" v-if="app.releaseNotesAvailable || app.changelog">
              <summary>更新日志</summary>
              <div class="changelog-content">
                <pre v-if="app.changelog">{{ app.changelog }}</pre>
                <p v-else>暂无 Release 日志内容。</p>
              </div>
            </details>

            <p class="repo-link">
              <a :href="app.repoUrl" target="_blank" rel="noreferrer">打开 GitHub 仓库</a>
            </p>
          </article>
        </div>
      </section>

      <div class="status-panel">
        <p v-if="loading">正在加载 GitHub Release 数据，请稍候…</p>
        <p v-if="loadError" class="error">{{ loadError }}</p>
        <p v-if="!loading && !loadError" class="success">已加载最新 Release 信息。</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, reactive, computed, ref } from 'vue';

const rawApps = [
  {
    category: '开发版',
    owner: 'timcode-cmyk',
    repo: 'pyMediaConvert',
    displayName: 'MediaTools',
  },
  {
    category: '开发版',
    owner: 'timcode-cmyk',
    repo: 'AssetsManager',
    displayName: 'AssetsManager',
  },
  {
    category: '正式版',
    owner: 'secure-artifacts',
    repo: 'pyMediaTools',
    displayName: 'MediaTools',
  },
  {
    category: '正式版',
    owner: 'secure-artifacts',
    repo: 'AssetsManager',
    displayName: 'AssetsManager',
  },
];

const apps = ref(
  rawApps.map((item) => ({
    ...item,
    repoFullName: `${item.owner}/${item.repo}`,
    repoUrl: `https://github.com/${item.owner}/${item.repo}`,
    logoUrl: 'https://via.placeholder.com/120?text=Loading',
    repoDescription: '',
    version: '',
    publishedAt: '',
    changelog: '',
    releaseNotesAvailable: false,
    downloads: {
      macos: '',
      windows: '',
    },
  }))
);

const loading = ref(true);
const loadError = ref('');

const categories = computed(() => {
  const groups = {
    '开发版': { name: '开发版', description: '最新开发测试版本。适合提前体验新功能。', apps: [] },
    '正式版': { name: '正式版', description: '稳定正式发行版本。适合生产环境使用。', apps: [] },
  };
  apps.value.forEach((app) => {
    groups[app.category]?.apps.push(app);
  });
  return Object.values(groups);
});

async function fetchAll() {
  try {
    await Promise.all(apps.value.map((appItem) => fetchAppData(appItem)));
  } catch (error) {
    console.error(error);
    loadError.value = '加载 GitHub Release 数据时出现问题，请稍后刷新重试。';
  } finally {
    loading.value = false;
  }
}

async function fetchAppData(appItem) {
  const repoApi = `https://api.github.com/repos/${appItem.owner}/${appItem.repo}`;
  const releaseApi = `${repoApi}/releases/latest`;

  const repoInfo = await fetchJson(repoApi);
  if (repoInfo) {
    appItem.repoDescription = repoInfo.description || '';
    appItem.logoUrl = repoInfo.open_graph_image_url || `https://opengraph.githubassets.com/1/${appItem.owner}/${appItem.repo}`;
  }

  const releaseInfo = await fetchJson(releaseApi);
  if (!releaseInfo || releaseInfo.message) {
    appItem.version = '暂无 Release';
    appItem.publishedAt = '';
    appItem.changelog = releaseInfo && releaseInfo.message ? releaseInfo.message : '';
    return;
  }

  appItem.version = releaseInfo.tag_name || releaseInfo.name || '未知版本';
  appItem.publishedAt = releaseInfo.published_at || releaseInfo.created_at || '';
  appItem.changelog = releaseInfo.body ? releaseInfo.body.trim() : '';
  appItem.releaseNotesAvailable = !!releaseInfo.body;
  setDownloadLinks(appItem, releaseInfo.assets || []);
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn(`GitHub API 请求失败：${url}`, response.status, errorData);
      return errorData || null;
    }
    return await response.json();
  } catch (error) {
    console.error('fetchJson', error);
    return null;
  }
}

function setDownloadLinks(appItem, assets) {
  const macAsset = findAssetForPlatform(assets, 'macos');
  const winAsset = findAssetForPlatform(assets, 'windows');

  if (macAsset) {
    appItem.downloads.macos = macAsset.browser_download_url;
  }
  if (winAsset) {
    appItem.downloads.windows = winAsset.browser_download_url;
  }
}

function findAssetForPlatform(assets, platform) {
  const normalized = assets.map((asset) => ({
    ...asset,
    nameLower: asset.name.toLowerCase(),
  }));

  if (platform === 'macos') {
    return (
      normalized.find((asset) => /\.dmg$|\.pkg$|macos|darwin/.test(asset.nameLower)) ||
      normalized.find((asset) => /\.dmg$|\.pkg$/.test(asset.nameLower)) ||
      null
    );
  }
  if (platform === 'windows') {
    return (
      normalized.find((asset) => /\.exe$|\.msi$|windows|win32|win64/.test(asset.nameLower)) ||
      normalized.find((asset) => /\.zip$/.test(asset.nameLower)) ||
      null
    );
  }
  return null;
}

function formatDate(raw) {
  if (!raw) {
    return '未知';
  }
  try {
    const date = new Date(raw);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return raw;
  }
}

onMounted(() => {
  fetchAll();
});
</script>
