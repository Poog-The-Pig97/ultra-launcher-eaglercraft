const repoOwner = 'Poog-The-Pig97';
const repoName = 'ultra-launcher-eaglercraft';
const pagesUrl = `https://${repoOwner.toLowerCase()}.github.io/${repoName}`;

const container = document.getElementById('versionContainer');
const statusPill = document.getElementById('statusPill');
const searchInput = document.getElementById('searchInput');

const versionGroupTemplate = document.getElementById('versionGroupTemplate');
const versionCardTemplate = document.getElementById('versionCardTemplate');

let allVersions = [];

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** i;
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function classifyName(name) {
  const lower = name.toLowerCase();

  if (/^ac-|absolutecraft/.test(lower)) {
    return 'AbsoluteCraft';
  }

  if (/wolfy|minceraft/.test(lower)) {
    return 'WolfyCraft';
  }

  if (/eaglercraft|eaglerforge|eagly|dragonx|zeus|wurstx|infdev|astra|pixel|resent|gx-client|beta|forge|client/.test(lower)) {
    return 'Eaglercraft';
  }

  return 'Custom';
}

function buildLaunchUrl(fileName) {
  return `${pagesUrl}/${encodeURIComponent(fileName)}`;
}

function renderVersions(list) {
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No versions match your search.</h3>
        <p>Try another name like Eaglercraft, AbsoluteCraft, WolfyCraft, or 1.8.8.</p>
      </div>
    `;
    return;
  }

  const groups = list.reduce((acc, version) => {
    const group = version.type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(version);
    return acc;
  }, {});

  const typeOrder = ['Eaglercraft', 'AbsoluteCraft', 'WolfyCraft', 'Custom'];

  const orderedGroups = Object.keys(groups).sort((a, b) => {
    const aIndex = typeOrder.indexOf(a);
    const bIndex = typeOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  orderedGroups.forEach((type) => {
    const versionGroup = versionGroupTemplate.content.cloneNode(true);
    const title = versionGroup.querySelector('.group-title');
    const count = versionGroup.querySelector('.group-count');
    const grid = versionGroup.querySelector('.version-grid');

    title.textContent = type;
    count.textContent = `${groups[type].length} versions`;

    groups[type].forEach((version) => {
      const card = versionCardTemplate.content.cloneNode(true);
      const name = card.querySelector('.version-name');
      const fileName = card.querySelector('.version-file');
      const tag = card.querySelector('.tag');
      const size = card.querySelector('.size');
      const launchButton = card.querySelector('.launch-button');

      const cleanName = version.name.replace(/\.html$/i, '').trim();
      name.textContent = cleanName;
      fileName.textContent = version.name;
      tag.textContent = version.type;
      size.textContent = version.size;
      launchButton.href = buildLaunchUrl(version.name);
      launchButton.textContent = 'Launch';

      grid.appendChild(card);
    });

    container.appendChild(versionGroup);
  });
}

function filterVersions(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    renderVersions(allVersions);
    return;
  }

  const filtered = allVersions.filter((version) => {
    const searchText = `${version.name} ${version.type}`.toLowerCase();
    return searchText.includes(normalized);
  });

  renderVersions(filtered);
}

async function fetchVersions() {
  statusPill.textContent = 'Loading versions...';

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents`);
    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status}`);
    }

    const items = await response.json();
    const htmlFiles = items
      .filter((item) => item.type === 'file' && item.name.toLowerCase().endsWith('.html'))
      .map((item) => ({
        name: item.name,
        type: classifyName(item.name),
        size: formatBytes(item.size || 0)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    allVersions = htmlFiles;
    renderVersions(allVersions);
    statusPill.textContent = `${allVersions.length} versions ready`;
  } catch (error) {
    console.error(error);
    statusPill.textContent = 'Failed to load versions';
    container.innerHTML = `
      <div class="empty-state">
        <h3>Could not load version list.</h3>
        <p>GitHub API access may be rate-limited or blocked. Try refreshing in a moment.</p>
      </div>
    `;
  }
}

searchInput.addEventListener('input', (event) => {
  filterVersions(event.target.value);
});

fetchVersions();
