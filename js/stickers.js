/* =========================================================================
   微信风格多AI聊天 - 表情功能模块 (stickers.js)
   ========================================================================= */

const MAX_STICKERS = 200;  // 最大表情数量限制
const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘',
    '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑',
    '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮',
    '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓',
    '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
    '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '💋',
    '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💤', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
    '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛',
    '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☀️', '🌙', '⭐', '🌟', '✨'
];

// 初始化Emoji网格
function initEmojiGrid() {
    if (!DOM.emojiGrid) return;
    DOM.emojiGrid.innerHTML = EMOJI_LIST.map(emoji => 
        `<button class="emoji-item" data-emoji="${emoji}">${emoji}</button>`
    ).join('');
}

// 渲染表情图网格
function renderStickerGrid() {
    if (!DOM.stickerGrid) return;
    
    if (appData.stickers.length === 0) {
        DOM.stickerGrid.innerHTML = '';
        if (DOM.stickerEmptyHint) DOM.stickerEmptyHint.style.display = 'block';
        return;
    }
    
    if (DOM.stickerEmptyHint) DOM.stickerEmptyHint.style.display = 'none';
    
    DOM.stickerGrid.innerHTML = appData.stickers.map(s => `
        <div class="sticker-item" data-sticker-name="${escapeHtml(s.name)}">
            <img src="${escapeHtml(s.url)}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.style.display='none'">
            <span class="sticker-name">:${escapeHtml(s.name)}:</span>
            <button class="delete-sticker-btn" data-sticker-id="${s.id}">×</button>
        </div>
    `).join('');
}

// 切换表情面板显示
function toggleStickerPanel() {
    const isShow = DOM.stickerPanel.classList.toggle('show');
    DOM.stickerToggleBtn.classList.toggle('active', isShow);
}

// 关闭表情面板
function closeStickerPanel() {
    if (DOM.stickerPanel) DOM.stickerPanel.classList.remove('show');
    if (DOM.stickerToggleBtn) DOM.stickerToggleBtn.classList.remove('active');
}

// 切换表情面板Tab
function switchStickerTab(tab) {
    DOM.emojiTabBtn.classList.toggle('active', tab === 'emoji');
    DOM.customStickerTabBtn.classList.toggle('active', tab === 'custom');
    DOM.emojiSection.classList.toggle('active', tab === 'emoji');
    DOM.customStickerSection.classList.toggle('active', tab === 'custom');
}

// 插入Emoji到输入框
function insertEmoji(emoji) {
    const input = DOM.chatPageMessageInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    input.value = text.substring(0, start) + emoji + text.substring(end);
    input.selectionStart = input.selectionEnd = start + emoji.length;
    input.focus();
}

// 插入表情代码到输入框
function insertStickerCode(name) {
    const input = DOM.chatPageMessageInput;
    const start = input.selectionStart;
    const text = input.value;
    const code = `:${name}:`;
    input.value = text.substring(0, start) + code + text.substring(start);
    input.selectionStart = input.selectionEnd = start + code.length;
    input.focus();
    closeStickerPanel();
}

// 打开添加表情模态框
function openAddStickerModal(mode) {
    appData.stickerTempData = { mode, uploadData: null };
    
    // 隐藏所有section
    DOM.stickerUploadSection.style.display = 'none';
    DOM.stickerUrlSection.style.display = 'none';
    DOM.stickerImportSection.style.display = 'none';
    
    // 重置表单
    DOM.uploadStickerName.value = '';
    DOM.urlStickerName.value = '';
    DOM.stickerUrlInput.value = '';
    DOM.stickerImportText.value = '';
    DOM.stickerUploadPreviewImg.style.display = 'none';
    DOM.stickerUploadPlaceholder.style.display = 'block';
    DOM.stickerUrlPreviewImg.style.display = 'none';
    DOM.stickerUrlPlaceholder.style.display = 'block';
    DOM.stickerFileInput.value = '';
    
    // 显示对应section和标题
    const titles = { upload: '上传表情图', url: '从URL添加表情图', import: '批量导入表情图' };
    DOM.addStickerModalTitle.textContent = titles[mode] || '添加表情图';
    
    if (mode === 'upload') DOM.stickerUploadSection.style.display = 'block';
    else if (mode === 'url') DOM.stickerUrlSection.style.display = 'block';
    else if (mode === 'import') DOM.stickerImportSection.style.display = 'block';
    
    DOM.addStickerModal.classList.remove('hidden');
    closeStickerPanel();
}

// 关闭添加表情模态框
function closeAddStickerModal() {
    DOM.addStickerModal.classList.add('hidden');
    appData.stickerTempData = { mode: 'upload', uploadData: null };
}

// 处理表情上传预览
async function handleStickerUpload(file) {
    if (!file || !file.type.startsWith('image/')) return;
    
    // 对于GIF保持原样，其他格式压缩
    if (file.type === 'image/gif') {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            if (dataUrl.length > 500 * 1024) { // 500KB 警告
                alert('GIF图片较大，建议使用URL方式添加以节省存储空间');
            }
            appData.stickerTempData.uploadData = dataUrl;
            DOM.stickerUploadPreviewImg.src = dataUrl;
            DOM.stickerUploadPreviewImg.style.display = 'block';
            DOM.stickerUploadPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
    } else {
        const compressed = await compressImage(file, 150);
        appData.stickerTempData.uploadData = compressed;
        DOM.stickerUploadPreviewImg.src = compressed;
        DOM.stickerUploadPreviewImg.style.display = 'block';
        DOM.stickerUploadPlaceholder.style.display = 'none';
    }
}

// 预览URL表情
function previewStickerUrl() {
    const url = DOM.stickerUrlInput.value.trim();
    if (url) {
        DOM.stickerUrlPreviewImg.src = url;
        DOM.stickerUrlPreviewImg.style.display = 'block';
        DOM.stickerUrlPlaceholder.style.display = 'none';
        DOM.stickerUrlPreviewImg.onerror = () => {
            DOM.stickerUrlPreviewImg.style.display = 'none';
            DOM.stickerUrlPlaceholder.style.display = 'block';
        };
    } else {
        DOM.stickerUrlPreviewImg.style.display = 'none';
        DOM.stickerUrlPlaceholder.style.display = 'block';
    }
}

// 保存表情
function saveSticker() {
    const mode = appData.stickerTempData.mode;
    
    if (appData.stickers.length >= MAX_STICKERS) {
        alert(`表情数量已达上限（${MAX_STICKERS}个），请先删除一些表情`);
        return;
    }
    
    if (mode === 'upload') {
        const name = DOM.uploadStickerName.value.trim();
        if (!name) { alert('请输入表情名称'); return; }
        if (!appData.stickerTempData.uploadData) { alert('请先选择图片'); return; }
        if (appData.stickers.find(s => s.name === name)) { alert('该表情名称已存在'); return; }
        
        appData.stickers.push({ id: generateUniqueId(), name, url: appData.stickerTempData.uploadData });
        
    } else if (mode === 'url') {
        const name = DOM.urlStickerName.value.trim();
        const url = DOM.stickerUrlInput.value.trim();
        if (!name || !url) { alert('请填写表情名称和URL'); return; }
        if (appData.stickers.find(s => s.name === name)) { alert('该表情名称已存在'); return; }
        
        appData.stickers.push({ id: generateUniqueId(), name, url });
        
    } else if (mode === 'import') {
        const text = DOM.stickerImportText.value.trim();
        if (!text) { alert('请输入要导入的表情'); return; }
        
        const lines = text.split('\n').filter(l => l.trim());
        let added = 0, errors = [];
        
        for (const line of lines) {
            if (appData.stickers.length >= MAX_STICKERS) break;
            
            const match = line.match(/^(.+?)[:：](.+)$/);
            if (match) {
                const name = match[1].trim();
                const url = match[2].trim();
                
                if (appData.stickers.find(s => s.name === name)) {
                    errors.push(`名称重复: ${name}`);
                    continue;
                }
                
                appData.stickers.push({ id: generateUniqueId() + '_' + added, name, url });
                added++;
            }
        }
        
        if (added > 0) alert(`成功导入 ${added} 个表情！`);
    }
    
    saveStickerData();
    renderStickerGrid();
    closeAddStickerModal();
}

// 删除表情
function deleteSticker(id) {
    if (!confirm('确定要删除这个表情吗？')) return;
    appData.stickers = appData.stickers.filter(s => s.id !== id);
    saveStickerData();
    renderStickerGrid();
}

// 保存表情数据
function saveStickerData() {
    try {
        localStorage.setItem('aiMultiChatStickers', JSON.stringify(appData.stickers));
    } catch (e) {
        console.error('保存表情数据失败:', e);
        alert('保存表情失败，可能存储空间不足。');
    }
}

// 加载表情数据
function loadStickerData() {
    try {
        const stored = localStorage.getItem('aiMultiChatStickers');
        appData.stickers = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('加载表情数据失败:', e);
        appData.stickers = [];
    }
}

// 显示表情全屏预览
function showStickerFullView(url) {
    DOM.stickerFullViewImg.src = url;
    DOM.stickerFullViewModal.classList.remove('hidden');
}

// 关闭表情全屏预览
function closeStickerFullView() {
    DOM.stickerFullViewModal.classList.add('hidden');
}

// 解析消息内容中的表情代码
function parseMessageStickers(content) {
    if (!content) return '';
    let result = escapeHtml(content);
    const stickerPattern = /:([^:\s]+):/g;
    let match;
    const replacements = [];
    
    while ((match = stickerPattern.exec(content)) !== null) {
        const name = match[1];
        const sticker = appData.stickers.find(s => s.name === name);
        if (sticker) {
            replacements.push({
                escaped: escapeHtml(`:${name}:`),
                html: `<img class="message-sticker" src="${escapeHtml(sticker.url)}" alt=":${escapeHtml(name)}:" title=":${escapeHtml(name)}:" loading="lazy" onclick="showStickerFullView('${escapeHtml(sticker.url)}')">`
            });
        }
    }
    
    for (const r of replacements) {
        result = result.split(r.escaped).join(r.html);
    }
    
    return result;
}
