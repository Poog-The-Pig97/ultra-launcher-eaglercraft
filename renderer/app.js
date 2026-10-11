const versionContainer = document.getElementById('versionContainer');
const versionsPathEl = document.getElementById('versionsPath');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshVersions');
const selectFolderBtn = document.getElementById('selectFolder');
const openFolderBtn = document.getElementById('openFolder');

const versionGroupTemplate = document.getElementById('versionGroupTemplate');
const versionCardTemplate = document.getElementById('versionCardTemplate');

let allVersions = [];
let allGrouped = {};

function updateStats(grouped) {
  const totalCount = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
  const eaglercraftCount = (grouped['Eaglercraft'] || []).length;
  const absolutecraftCount = (grouped['AbsoluteCraft'] || []).length;
  
  document.getElementById('totalCount').textContent = totalCount;
  document.getElementById('eaglercraftCount').textContent = eaglercraftCount;
  document.getElementById('absolutecraftCount').textContent = absolutecraftCount;
}

async function loadVersions() {
  try {
    const result = await window.launcherAPI.getVersionList();
    const { versions, grouped, currentPath } = result;
    
    allVersions = versions;
    allGrouped = grouped;
    
    versionsPathEl.textContent = currentPath;
    updateStats(grouped);
    renderVersions(grouped);
  } catch (error) {
    console.error('Load error:', error);
    versionContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error loading versions</h3>
        <p>${error.message || 'Unable to load versions.'}</p>
      </div>
    `;
  }
}

function renderVersions(grouped) {
  versionContainer.innerHTML = '';
  
  if (Object.keys(grouped).length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <h3>No versions found</h3>
      <p>Place your HTML game files in your versions folder.</p>
      <p>Then click <strong>Refresh</strong> to see them here.</p>
    `;
    versionContainer.appendChild(empty);
    return;
  }

  const typeOrder = ['Eaglercraft', 'AbsoluteCraft', 'WolfyCraft', 'Custom'];
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const aIndex = typeOrder.indexOf(a);
    const bIndex = typeOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  sortedTypes.forEach((type) => {
    const versions = grouped[type];
    if (versions.length === 0) return;

    const groupEl = versionGroupTemplate.content.cloneNode(true);
    const groupTitle = groupEl.querySelector('.group-title');
    const versionGrid = groupEl.querySelector('.version-grid');

    groupTitle.textContent = type + ` (${versions.length})`;

    versions.forEach((version) => {
      const card = versionCardTemplate.content.cloneNode(true);
      const nameEl = card.querySelector('.version-name');
      const fileEl = card.querySelector('.version-file');
      const sizeEl = card.querySelector('.size');
      const tagEl = card.querySelector('.tag');
      const launchButton = card.querySelector('.launch-btn');

      nameEl.textContent = version.displayName;
      fileEl.textContent = version.name;
      sizeEl.textContent = version.sizeFormatted;
      tagEl.textContent = version.type;

      launchButton.addEventListener('click', async () => {
        await window.launcherAPI.launchVersion(version.path);
      });

      versionGrid.appendChild(card);
    });

    versionContainer.appendChild(groupEl);
  });
}

function filterVersions(query) {
  if (!query.trim()) {
    renderVersions(allGrouped);
    return;
  }

  const lowerQuery = query.toLowerCase();
  const filtered = {};

  Object.entries(allGrouped).forEach(([type, versions]) => {
    const matched = versions.filter((v) =>
      v.displayName.toLowerCase().includes(lowerQuery) ||
      v.name.toLowerCase().includes(lowerQuery)
    );
    if (matched.length > 0) {
      filtered[type] = matched;
    }
  });

  if (Object.keys(filtered).length === 0) {
    versionContainer.innerHTML = `
      <div class="empty-state">
        <h3>No matches found</h3>
        <p>Try a different search term.</p>
      </div>
    `;
  } else {
    renderVersions(filtered);
  }
}

refreshBtn.addEventListener('click', loadVersions);

selectFolderBtn.addEventListener('click', async () => {
  const result = await window.launcherAPI.selectVersionsDir();
  if (result) {
    allVersions = result.versions;
    allGrouped = result.grouped;
    versionsPathEl.textContent = result.currentPath;
    updateStats(result.grouped);
    searchInput.value = '';
    renderVersions(result.grouped);
  }
});

openFolderBtn.addEventListener('click', async () => {
  await window.launcherAPI.openVersionsFolder();
});

searchInput.addEventListener('input', (e) => {
  filterVersions(e.target.value);
});

loadVersions();
