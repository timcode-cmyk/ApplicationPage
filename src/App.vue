<template>
  <div id="app-container">
    <header class="app-header">
      <h1>软件与资源中心</h1>
      <p>一个用于展示项目、工具和推荐资源的聚合页面。</p>
    </header>

    <nav class="category-nav">
      <button @click="setActiveCategory('All')" :class="{ active: activeCategory === 'All' }">
        All
      </button>
      <button
        v-for="category in categories"
        :key="category"
        @click="setActiveCategory(category)"
        :class="{ active: activeCategory === category }"
      >
        {{ category }}
      </button>
    </nav>

    <main>
      <div v-if="loading" class="status-indicator">
        <div class="spinner"></div>
        <p>正在从 GitHub 加载最新数据...</p>
      </div>
      <div v-if="error" class="status-indicator error">
        <p>{{ error }}</p>
      </div>

      <div class="cards-grid">
        <article
          v-for="item in filteredItems"
          :key="item.id"
          class="item-card"
          :class="'card-type-' + item.type"
        >
          <a :href="item.mainUrl" target="_blank" rel="noopener noreferrer" class="card-link-wrapper">
            <div class="card-header">
              <img :src="item.logoUrl" :alt="item.displayName" class="logo" />
              <div class="title-group">
                <h3>{{ item.displayName }}</h3>
                <span class="category-tag">{{ item.category }}</span>
              </div>
            </div>
            <p class="description">{{ item.description }}</p>

            <!-- GitHub-specific Meta -->
            <div v-if="item.type === 'github'" class="metadata">
              <div class="meta-item">
                <span class="meta-label">版本</span>
                <span class="meta-value">{{ item.version || 'N/A' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">更新于</span>
                <span class="meta-value">{{ item.lastUpdated || 'N/A' }}</span>
              </div>
            </div>

            <div class="card-footer">
              <!-- GitHub-specific Downloads -->
              <template v-if="item.type === 'github'">
                <div class="download-buttons">
                  <a v-if="item.macUrl" :href="item.macUrl" class="button" @click.stop>下载 (macOS)</a>
                  <a v-if="item.winUrl" :href="item.winUrl" class="button" @click.stop>下载 (Windows)</a>
                </div>
              </template>
              <!-- Link for 'link' type cards -->
              <template v-if="item.type === 'link'">
                <span class="button primary">访问网站</span>
              </template>
            </div>
          </a>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

// ====================================================================================
// MAINTAINABILITY HUB: Edit this array to add/remove/change items.
// ====================================================================================
// - type: 'github' for GitHub repos, 'link' for any other website.
// - category: The filter tag for the item.
// - for 'github': specify 'owner' and 'repo'.
// - for 'link': specify 'url'.
// - displayName and description are required for all types.
// ====================================================================================
const config = [
  {
    type: 'github',
    category: '开发工具',
    owner: 'timcode-cmyk',
    repo: 'pyMediaConvert',
    displayName: 'Media Tools',
    description: '一个基于 Python 的媒体文件处理工具，用于自动化转换和优化。',
  },
  {
    type: 'github',
    category: '效率工具',
    owner: 'timcode-cmyk',
    repo: 'AssetsManager',
    displayName: 'Assets Manager',
    description: '用于管理和组织创意项目中的数字资产，支持版本控制。',
  },
  {
    type: 'link',
    category: '设计资源',
    url: 'https://figma.com',
    displayName: 'Figma',
    description: '一个协作式界面设计工具，广泛用于 UI/UX 设计和原型制作。',
  },
  {
    type: 'link',
    category: '设计资源',
    url: 'https://coolors.co',
    displayName: 'Coolors',
    description: '快速生成和浏览漂亮的配色方案，是设计师寻找灵感的好帮手。',
  },
  {
    type: 'github',
    category: '效率工具',
    owner: 'microsoft',
    repo: 'powertoys',
    displayName: 'PowerToys',
    description: '一套为高级用户调整和简化 Windows 体验的实用工具集。'
  }
];

// --- State Management ---
const items = ref([]);
const loading = ref(true);
const error = ref('');
const activeCategory = ref('All');

// --- Computed Properties ---
const categories = computed(() => {
  const allCategories = items.value.map(item => item.category);
  return [...new Set(allCategories)];
});

const filteredItems = computed(() => {
  if (activeCategory.value === 'All') {
    return items.value;
  }
  return items.value.filter(item => item.category === activeCategory.value);
});

// --- Functions ---
function setActiveCategory(category) {
  activeCategory.value = category;
}

function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function fetchGitHubData(owner, repo) {
  try {
    const releaseApiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const repoApiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const [releaseRes, repoRes] = await Promise.all([
      fetch(releaseApiUrl),
      fetch(repoApiUrl)
    ]);

    const repoData = repoRes.ok ? await repoRes.json() : null;
    const releaseData = releaseRes.ok ? await releaseRes.json() : null;
    
    const macAsset = releaseData?.assets.find(a => a.name.toLowerCase().includes('macos') || a.name.endsWith('.dmg'));
    const winAsset = releaseData?.assets.find(a => a.name.toLowerCase().includes('win') || a.name.endsWith('.exe') || a.name.endsWith('.msi'));

    return {
      version: releaseData?.tag_name || '无发布',
      lastUpdated: formatDate(releaseData?.published_at),
      macUrl: macAsset?.browser_download_url,
      winUrl: winAsset?.browser_download_url,
      logoUrl: repoData?.owner.avatar_url,
    };
  } catch (err) {
    console.error(`Failed to fetch data for ${owner}/${repo}:`, err);
    return { error: 'Data fetch failed' };
  }
}

async function processConfig() {
  const processedItems = await Promise.all(config.map(async (item, index) => {
    const baseItem = {
      id: `${item.type}-${index}`,
      type: item.type,
      displayName: item.displayName,
      description: item.description,
      category: item.category,
    };

    if (item.type === 'github') {
      const githubData = await fetchGitHubData(item.owner, item.repo);
      return {
        ...baseItem,
        mainUrl: `https://github.com/${item.owner}/${item.repo}`,
        logoUrl: githubData.logoUrl || `https://github.com/${item.owner}.png`,
        ...githubData
      };
    }

    if (item.type === 'link') {
      return {
        ...baseItem,
        mainUrl: item.url,
        logoUrl: `https://www.google.com/s2/favicons?sz=64&domain_url=${item.url}`
      };
    }

    return null;
  }));

  items.value = processedItems.filter(Boolean);
}

// --- Lifecycle Hook ---
onMounted(async () => {
  try {
    await processConfig();
  } catch (err) {
    error.value = '加载配置时发生未知错误。';
  } finally {
    loading.value = false;
  }
});
</script>
