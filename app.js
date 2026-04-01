const releaseApps = [
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

const app = Vue.createApp({
  data() {
    return {
      apps: releaseApps.map((item) => ({
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
      })),
      loading: true,
      loadError: '',
    };
  },
  computed: {
    categories() {
      const groups = {
        '开发版': { name: '开发版', description: '最新开发测试版本。适合提前体验新功能。', apps: [] },
        '正式版': { name: '正式版', description: '稳定正式发行版本。适合生产环境使用。', apps: [] },
      };
      this.apps.forEach((app) => {
        groups[app.category]?.apps.push(app);
      });
      return Object.values(groups);
    },
  },
  methods: {
    async fetchAll() {
      try {
        const promises = this.apps.map((appItem) => this.fetchAppData(appItem));
        await Promise.all(promises);
      } catch (error) {
        console.error(error);
        this.loadError = '加载 GitHub Release 数据时出现问题，请稍后刷新重试。';
      } finally {
        this.loading = false;
      }
    },
    async fetchAppData(appItem) {
      const repoApi = `https://api.github.com/repos/${appItem.owner}/${appItem.repo}`;
      const releaseApi = `${repoApi}/releases/latest`;

      const repoInfo = await this.fetchJson(repoApi);
      if (repoInfo) {
        appItem.repoDescription = repoInfo.description || '';
        appItem.logoUrl = repoInfo.open_graph_image_url || `https://opengraph.githubassets.com/1/${appItem.owner}/${appItem.repo}`;
      }

      const releaseInfo = await this.fetchJson(releaseApi);
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
      this.setDownloadLinks(appItem, releaseInfo.assets || []);
    },
    async fetchJson(url) {
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
    },
    setDownloadLinks(appItem, assets) {
      const macAsset = this.findAssetForPlatform(assets, 'macos');
      const winAsset = this.findAssetForPlatform(assets, 'windows');

      if (macAsset) {
        appItem.downloads.macos = macAsset.browser_download_url;
      }
      if (winAsset) {
        appItem.downloads.windows = winAsset.browser_download_url;
      }
    },
    findAssetForPlatform(assets, platform) {
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
    },
    formatDate(raw) {
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
    },
  },
  mounted() {
    this.fetchAll();
  },
});

app.mount('#app');
