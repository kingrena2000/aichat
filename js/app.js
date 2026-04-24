/*=========================================================================微信风格多AI聊天 - 主入口 (app.js)
   v5.3+ 设置同步机制
   ========================================================================= */

// ==================== 设置同步机制 ====================
const SETTINGS_SYNC_KEY = 'wechat_ai_settings';

// 从外部 settings.html 读取设置，合并到 appData
function syncSettingsFromExternal() {
    try {
        const raw = localStorage.getItem(SETTINGS_SYNC_KEY);
        if (!raw) return;
        const ext = JSON.parse(raw);
        if (!appData || !appData.apiConfig) return;
        const c = appData.apiConfig;
        if (ext.baseUrl !== undefined) c.baseUrl = ext.baseUrl;
        if (ext.apiKey !== undefined) c.apiKey = ext.apiKey;
        if (ext.modelName !== undefined) c.modelName = ext.modelName;
        if (ext.temperature !== undefined) c.temperature = ext.temperature;
        if (ext.historyTurns !== undefined) c.historyTurns = ext.historyTurns;
        if (ext.diaryGenerationTurns !== undefined) c.diaryGenerationTurns = ext.diaryGenerationTurns;
        if (ext.globalSystemPrompt !== undefined) c.globalSystemPrompt = ext.globalSystemPrompt;
        if (ext.imageGenBaseUrl !== undefined) c.imageGenBaseUrl = ext.imageGenBaseUrl;
        if (ext.imageGenApiKey !== undefined) c.imageGenApiKey = ext.imageGenApiKey;
        if (ext.imageGenModelName !== undefined) c.imageGenModelName = ext.imageGenModelName;
        if (ext.imageGenInterface !== undefined) c.imageGenInterfaceType = ext.imageGenInterface;
        if (ext.auxBaseUrl !== undefined) c.auxBaseUrl = ext.auxBaseUrl;
        if (ext.auxApiKey !== undefined) c.auxApiKey = ext.auxApiKey;
        if (ext.auxModelName !== undefined) c.auxModelName = ext.auxModelName;
        if (ext.userName && appData.userInfo) appData.userInfo.name = ext.userName;
        if (ext.userAvatar && appData.userInfo) appData.userInfo.avatar = { type: 'url', url: ext.userAvatar };
    } catch (e) { console.log('syncSettingsFromExternal:', e.message); }
}

// 将 appData 的设置写入共享key，供 settings.html 读取
function syncSettingsToExternal() {
    try {
        const c = appData.apiConfig || {};
        const u = appData.userInfo || {};
        localStorage.setItem(SETTINGS_SYNC_KEY, JSON.stringify({
            baseUrl: c.baseUrl || '',
            apiKey: c.apiKey || '',
            modelName: c.modelName || '',
            temperature: c.temperature || 0.7,
            historyTurns: c.historyTurns || 10,
            diaryGenerationTurns: c.diaryGenerationTurns || 30,
            globalSystemPrompt: c.globalSystemPrompt || '',
            userName: u.name || 'user',
            userAvatar: (u.avatar && u.avatar.url) || '',
            imageGenBaseUrl: c.imageGenBaseUrl || '',
            imageGenApiKey: c.imageGenApiKey || '',
            imageGenModelName: c.imageGenModelName || '',
            imageGenInterface: c.imageGenInterfaceType || 'chat',
            auxBaseUrl: c.auxBaseUrl || '',
            auxApiKey: c.auxApiKey || '',
            auxModelName: c.auxModelName || '',}));
    } catch (e) { console.log('syncSettingsToExternal:', e.message); }
}

// 定义全局 DOM 对象
window.DOM = {
    //聊天列表
    chatListPage: document.getElementById('chatListPage'),
    chatListContainer: document.getElementById('chatListContainer'),
    emptyChatList: document.getElementById('emptyChatList'),
    addChatBtn: document.getElementById('addChatBtn'),
    
    // 导航
    chatNavBtn: document.getElementById('chatNavBtn'),
    momentsNavBtn: document.getElementById('momentsNavBtn'),
    diaryNavBtn: document.getElementById('diaryNavBtn'),
    settingsNavBtn: document.getElementById('settingsNavBtn'),
    
    // 聊天页
    chatPage: document.getElementById('chatPage'),
    backToChatListBtn: document.getElementById('backToChatListBtn'),
    chatPageAvatar: document.getElementById('chatPageAvatar'),
    chatPageTitle: document.getElementById('chatPageTitle'),
    chatPageMoreBtn: document.getElementById('chatPageMoreBtn'),
    chatPageContainer: document.getElementById('chatPageContainer'),
    chatPageMessageInput: document.getElementById('chatPageMessageInput'),
    chatPageSendBtn: document.getElementById('chatPageSendBtn'),
    chatPageTypingIndicator: document.getElementById('chatPageTypingIndicator'),
    chatPageTypingText: document.getElementById('chatPageTypingText'),
    
    // 设置页
    settingsPage: document.getElementById('settingsPage'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    settingsForm: document.getElementById('settingsForm'),
    baseUrl: document.getElementById('baseUrl'),
    apiKey: document.getElementById('apiKey'),
    modelName: document.getElementById('modelName'),
    refreshModelsBtn: document.getElementById('refreshModelsBtn'),
    apiTemperature: document.getElementById('apiTemperature'),
    historyTurns: document.getElementById('historyTurns'),
    globalSystemPrompt: document.getElementById('globalSystemPrompt'),
    userName: document.getElementById('userName'),
    diaryGenerationTurns: document.getElementById('diaryGenerationTurns'),
    
    // 用户头像设置
    userAvatarPreview: document.getElementById('userAvatarPreview'),
    userAvatarIcon: document.getElementById('userAvatarIcon'),
    userAvatarUpload: document.getElementById('userAvatarUpload'),
    userAvatarUrlBtn: document.getElementById('userAvatarUrlBtn'),
    userAvatarUrlContainer: document.getElementById('userAvatarUrlContainer'),
    userAvatarUrl: document.getElementById('userAvatarUrl'),
    userAvatarUrlConfirm: document.getElementById('userAvatarUrlConfirm'),
    userAvatarUrlCancel: document.getElementById('userAvatarUrlCancel'),
    
    // 聊天对象添加/编辑模态框
    addChatModal: document.getElementById('addChatModal'),
    closeAddChatModalBtn: document.getElementById('closeAddChatModalBtn'),
    newChatAvatarPreview: document.getElementById('newChatAvatarPreview'),
    newChatAvatarIcon: document.getElementById('newChatAvatarIcon'),
    newChatAvatarUpload: document.getElementById('newChatAvatarUpload'),
    newChatAvatarUrlBtn: document.getElementById('newChatAvatarUrlBtn'),
    newChatAvatarUrlContainer: document.getElementById('newChatAvatarUrlContainer'),
    newChatAvatarUrl: document.getElementById('newChatAvatarUrl'),
    newChatAvatarUrlConfirm: document.getElementById('newChatAvatarUrlConfirm'),
    newChatAvatarUrlCancel: document.getElementById('newChatAvatarUrlCancel'),
    newChatName: document.getElementById('newChatName'),
    newChatSystemPrompt: document.getElementById('newChatSystemPrompt'),
    createChatBtn: document.getElementById('createChatBtn'),
    
    // 聊天详情页
    chatDetailPage: document.getElementById('chatDetailPage'),
    backToChatPageBtn: document.getElementById('backToChatPageBtn'),
    deleteChatBtn: document.getElementById('deleteChatBtn'),
    editChatAvatarPreview: document.getElementById('editChatAvatarPreview'),
    editChatAvatarIcon: document.getElementById('editChatAvatarIcon'),
    editAvatarBtn: document.getElementById('editAvatarBtn'),
    editAvatarContainer: document.getElementById('editAvatarContainer'),
    editChatAvatarUpload: document.getElementById('editChatAvatarUpload'),
    editChatAvatarUrlBtn: document.getElementById('editChatAvatarUrlBtn'),
    editChatAvatarUrlContainer: document.getElementById('editChatAvatarUrlContainer'),
    editChatAvatarUrl: document.getElementById('editChatAvatarUrl'),
    editChatAvatarUrlConfirm: document.getElementById('editChatAvatarUrlConfirm'),
    editChatAvatarUrlCancel: document.getElementById('cancelEditAvatarBtn'),
    editChatName: document.getElementById('editChatName'),
    editChatSystemPrompt: document.getElementById('editChatSystemPrompt'),
    saveChatDetailBtn: document.getElementById('saveChatDetailBtn'),
    
    // 确认删除模态框
    confirmDeleteModal: document.getElementById('confirmDeleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    
    // 消息右键菜单
    messageContextMenu: document.getElementById('messageContextMenu'),
    regenerateMessageBtn: document.getElementById('regenerateMessageBtn'),
    editMessageBtn: document.getElementById('editMessageBtn'),
    deleteMessageBtn: document.getElementById('deleteMessageBtn'),
    resendMessageBtn: document.getElementById('resendMessageBtn'),
    
    // 备份恢复
    backupDataBtn: document.getElementById('backupDataBtn'),
    restoreDataBtn: document.getElementById('restoreDataBtn'),
    restoreFileInput: document.getElementById('restoreFileInput'),
    restoreModal: document.getElementById('restoreModal'),
    closeRestoreModalBtn: document.getElementById('closeRestoreModalBtn'),
    cancelRestoreBtn: document.getElementById('cancelRestoreBtn'),
    confirmRestoreBtn: document.getElementById('confirmRestoreBtn'),
    restoreChatList: document.getElementById('restoreChatList'),
    restoreSelectAll: document.getElementById('restoreSelectAll'),
    
    // 日记相关
    diaryListPage: document.getElementById('diaryListPage'),
    closeDiaryListPageBtn: document.getElementById('closeDiaryListPageBtn'),
    diaryListContainer: document.getElementById('diaryListContainer'),
    diaryDetailPage: document.getElementById('diaryDetailPage'),
    backToDiaryListBtn: document.getElementById('backToDiaryListBtn'),
    diaryDetailPageTitle: document.getElementById('diaryDetailPageTitle'),
    diaryEntriesContainer: document.getElementById('diaryEntriesContainer'),
    manualDiaryBtn: document.getElementById('manualDiaryBtn'),
    resetDiaryPtrBtn: document.getElementById('resetDiaryPtrBtn'),
    editDiaryEntryModal: document.getElementById('editDiaryEntryModal'),
    closeEditDiaryModalBtn: document.getElementById('closeEditDiaryModalBtn'),
    editDiaryEntryText: document.getElementById('editDiaryEntryText'),
    cancelEditDiaryBtn: document.getElementById('cancelEditDiaryBtn'),
    saveEditDiaryBtn: document.getElementById('saveEditDiaryBtn'),
    
    // 朋友圈
    momentsPage: document.getElementById('momentsPage'),
    closeMomentsPageBtn: document.getElementById('closeMomentsPageBtn'),
    momentsChatSelector: document.getElementById('momentsChatSelector'),
    openPublishMomentBtn: document.getElementById('openPublishMomentBtn'),
    momentsUserName: document.getElementById('momentsUserName'),
    momentsUserAvatar: document.getElementById('momentsUserAvatar'),
    momentsListContainer: document.getElementById('momentsListContainer'),
    momentDetailPage: document.getElementById('momentDetailPage'),
    backToMomentsBtn: document.getElementById('backToMomentsBtn'),
    deleteMomentBtn: document.getElementById('deleteMomentBtn'),
    momentDetailContent: document.getElementById('momentDetailContent'),
    momentCommentInput: document.getElementById('momentCommentInput'),
    momentCommentSendBtn: document.getElementById('momentCommentSendBtn'),
    publishMomentModal: document.getElementById('publishMomentModal'),
    closePublishMomentModalBtn: document.getElementById('closePublishMomentModalBtn'),
    publishModeAuto: document.getElementById('publishModeAuto'),
    publishModeManual: document.getElementById('publishModeManual'),
    publishAutoOptions: document.getElementById('publishAutoOptions'),
    publishManualOptions: document.getElementById('publishManualOptions'),
    publishMomentContent: document.getElementById('publishMomentContent'),
    publishMomentImages: document.getElementById('publishMomentImages'),
    confirmPublishMomentBtn: document.getElementById('confirmPublishMomentBtn'),
    // NPC好友
    npcFriendsModal: document.getElementById('npcFriendsModal'),
    aiSuggestFriendsModal: document.getElementById('aiSuggestFriendsModal'),
    // 生图API配置
    imageGenBaseUrl: document.getElementById('imageGenBaseUrl'),
    imageGenApiKey: document.getElementById('imageGenApiKey'),
    imageGenModelName: document.getElementById('imageGenModelName'),
    imageGenInterfaceChat: document.getElementById('imageGenInterfaceChat'),
    imageGenInterfaceImages: document.getElementById('imageGenInterfaceImages'),
    //辅助API配置
    auxBaseUrl: document.getElementById('auxBaseUrl'),
    auxApiKey: document.getElementById('auxApiKey'),
    auxModelName: document.getElementById('auxModelName'),
    saveAllSettingsBtn: document.getElementById('saveAllSettingsBtn'),
    
    // 日志
    viewLogsBtn: document.getElementById('viewLogsBtn'),
    clearLogsBtn: document.getElementById('clearLogsBtn'),
    logModal: document.getElementById('logModal'),
    closeLogModalBtn: document.getElementById('closeLogModalBtn'),
    logOutput: document.getElementById('logOutput'),
    // 表情功能
    stickerPanel: document.getElementById('stickerPanel'),
    stickerToggleBtn: document.getElementById('stickerToggleBtn'),
    emojiTabBtn: document.getElementById('emojiTabBtn'),
    customStickerTabBtn: document.getElementById('customStickerTabBtn'),
    emojiSection: document.getElementById('emojiSection'),
    customStickerSection: document.getElementById('customStickerSection'),
    emojiGrid: document.getElementById('emojiGrid'),
    stickerGrid: document.getElementById('stickerGrid'),
    stickerEmptyHint: document.getElementById('stickerEmptyHint'),
    addStickerUploadBtn: document.getElementById('addStickerUploadBtn'),
    addStickerUrlBtn: document.getElementById('addStickerUrlBtn'),
    addStickerImportBtn: document.getElementById('addStickerImportBtn'),
    addStickerModal: document.getElementById('addStickerModal'),
    addStickerModalTitle: document.getElementById('addStickerModalTitle'),
    closeAddStickerModalBtn: document.getElementById('closeAddStickerModalBtn'),
    stickerUploadSection: document.getElementById('stickerUploadSection'),
    stickerUrlSection: document.getElementById('stickerUrlSection'),
    stickerImportSection: document.getElementById('stickerImportSection'),
    stickerUploadPreviewBox: document.getElementById('stickerUploadPreviewBox'),
    stickerUploadPlaceholder: document.getElementById('stickerUploadPlaceholder'),
    stickerUploadPreviewImg: document.getElementById('stickerUploadPreviewImg'),
    stickerFileInput: document.getElementById('stickerFileInput'),
    uploadStickerName: document.getElementById('uploadStickerName'),
    stickerUrlPreviewBox: document.getElementById('stickerUrlPreviewBox'),
    stickerUrlPlaceholder: document.getElementById('stickerUrlPlaceholder'),
    stickerUrlPreviewImg: document.getElementById('stickerUrlPreviewImg'),
    stickerUrlInput: document.getElementById('stickerUrlInput'),
    urlStickerName: document.getElementById('urlStickerName'),
    stickerImportText: document.getElementById('stickerImportText'),
    cancelAddStickerBtn: document.getElementById('cancelAddStickerBtn'),
    confirmAddStickerBtn: document.getElementById('confirmAddStickerBtn'),
    stickerFullViewModal: document.getElementById('stickerFullViewModal'),
    stickerFullViewImg: document.getElementById('stickerFullViewImg'),
};

// 初始化
function init() {
    loadDataFromStorage();
    syncSettingsFromExternal(); // ★ 从settings.html 同步
    loadUIData();
    renderChatList();
    setupEventListeners();
    initEmojiGrid();
    renderStickerGrid();
    setTimeout(adjustHeights, 100);
}

// 布局调整
function adjustHeights() {
    const vh = window.innerHeight;
    const h1 = DOM.chatListPage.querySelector('header')?.offsetHeight || 0;
    const n1 = DOM.chatListPage.querySelector('nav')?.offsetHeight || 0;
    if (DOM.chatListContainer) DOM.chatListContainer.style.height = `${vh - h1 - n1}px`;
    
    const h2 = DOM.chatPage.querySelector('header')?.offsetHeight || 0;
    const i2 = DOM.chatPage.querySelector('.chat-input-container')?.offsetHeight || 0;
    if (DOM.chatPageContainer) DOM.chatPageContainer.style.height = `${vh - h2 - i2}px`;
}

// 页面切换
function togglePage(page, show) {
    [DOM.chatNavBtn, DOM.momentsNavBtn, DOM.diaryNavBtn, DOM.settingsNavBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('nav-item-active');
            btn.classList.add('text-wechat-lightText');
        }
    });

    const setActive = (btn) => {
        if (btn) {
            btn.classList.add('nav-item-active');
            btn.classList.remove('text-wechat-lightText');
        }
    };

    const sidePages = [DOM.settingsPage, DOM.momentsPage, DOM.diaryListPage];

    if (page === 'settings') {
        DOM.settingsPage.classList.toggle('translate-x-full', !show);
        if (show) { loadUIData(); setActive(DOM.settingsNavBtn); }
        else { setActive(DOM.chatNavBtn); }
    } else if (page === 'moments') {
        DOM.momentsPage.classList.toggle('translate-x-full', !show);
        if (show) { renderMomentsList(); clearMomentsUnread(); setActive(DOM.momentsNavBtn); }
        else { setActive(DOM.chatNavBtn); }
    } else if (page === 'diary') {
        DOM.diaryListPage.classList.toggle('translate-x-full', !show);
        if (show) { renderDiaryList(); setActive(DOM.diaryNavBtn); }
        else { setActive(DOM.chatNavBtn); }
    } else {
        sidePages.forEach(p => { if (p && !p.classList.contains('translate-x-full')) p.classList.add('translate-x-full'); });
        setActive(DOM.chatNavBtn);
    }
}

function isDiaryPageVisible() {
    return !DOM.diaryListPage.classList.contains('translate-x-full');
}

// 头像处理辅助
function updateAvatarPreview(p, i, a) {
    const d = !a || a.type === 'default' || !a.url;
    p.style.display = d ? 'none' : 'block';
    i.style.display = d ? 'flex' : 'none';
    if (!d) {
        p.src = a.url;
        p.onerror = () => { p.style.display = 'none'; i.style.display = 'flex'; }
    }
}

const updateNewChatAvatarPreview = () => updateAvatarPreview(DOM.newChatAvatarPreview, DOM.newChatAvatarIcon, appData.newChatTempData.avatar);
const updateEditChatAvatarPreview = () => updateAvatarPreview(DOM.editChatAvatarPreview, DOM.editChatAvatarIcon, appData.editChatTempData.avatar);
const updateUserAvatarPreview = () => updateAvatarPreview(DOM.userAvatarPreview, DOM.userAvatarIcon, appData.userAvatarTempData);

const handleNewChatAvatarUpload = (e) => handleGenericAvatarUpload(e.target.files[0], appData.newChatTempData, updateNewChatAvatarPreview);
const handleEditChatAvatarUpload = (e) => handleGenericAvatarUpload(e.target.files[0], appData.editChatTempData, updateEditChatAvatarPreview);

async function handleGenericAvatarUpload(file, tempData, updateFunc) {
    if (!file || !file.type.startsWith('image/')) return;
    const compressedUrl = await compressImage(file, 128);
    tempData.avatar = { type: 'upload', url: compressedUrl };
    updateFunc();
}

async function handleUserAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const compressedUrl = await compressImage(file, 128);
    appData.userAvatarTempData.type = 'upload';
    appData.userAvatarTempData.url = compressedUrl;
    updateUserAvatarPreview();
}

function handleUserAvatarUrl() {
    const url = DOM.userAvatarUrl.value.trim();
    if (!url) return;
    try { new URL(url) } catch { return alert('请输入有效的URL') }
    appData.userAvatarTempData = { type: 'url', url: url };
    updateUserAvatarPreview();
    DOM.userAvatarUrlContainer.classList.add('hidden');
    DOM.userAvatarUrl.value = '';
}

function handleAvatarUrl(inputElem, containerElem, dataObj, updateFunc) {
    const url = inputElem.value.trim();
    if (!url) return;
    try { new URL(url) } catch { alert('请输入有效的URL'); return }
    dataObj.avatar = { type: 'url', url: url };
    updateFunc();
    containerElem.classList.add('hidden');
    inputElem.value = '';
}

const handleNewChatAvatarUrl = () => handleAvatarUrl(DOM.newChatAvatarUrl, DOM.newChatAvatarUrlContainer, appData.newChatTempData, updateNewChatAvatarPreview);
const handleEditChatAvatarUrl = () => handleAvatarUrl(DOM.editChatAvatarUrl, DOM.editChatAvatarUrlContainer, appData.editChatTempData, updateEditChatAvatarPreview);

function openAddChatModal() {
    appData.newChatTempData.avatar = { type: 'default', url: '' };
    DOM.newChatName.value = 'AI助手';
    DOM.newChatSystemPrompt.value = '你是一个友好、helpful的AI助手。';
    DOM.newChatAvatarUrl.value = '';
    DOM.newChatAvatarUrlContainer.classList.add('hidden');
    updateNewChatAvatarPreview();
    DOM.addChatModal.classList.remove('hidden');
}

function closeAddChatModal() {
    DOM.addChatModal.classList.add('hidden');
}

// 获取模型列表
async function fetchModelList() {
    const btn = DOM.refreshModelsBtn;
    const baseUrl = DOM.baseUrl.value.trim();
    const apiKey = DOM.apiKey.value.trim();
    if (!baseUrl || !apiKey) { alert('请先填写 API Base URL 和 API Key'); return; }
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) throw new Error(`获取失败: ${response.status}`);
        const data = await response.json();
        const models = data.data || [];
        if (models.length === 0) { alert('未获取到任何模型'); return; }
        
        const currentValue = DOM.modelName.value;
        DOM.modelName.innerHTML = '';
        models.map(m => m.id).sort().forEach(modelId => {
            const option = document.createElement('option');
            option.value = modelId;
            option.textContent = modelId;
            if (modelId === currentValue) option.selected = true;
            DOM.modelName.appendChild(option);
        });
        
        if (!DOM.modelName.value && currentValue) {
            const option = document.createElement('option');
            option.value = currentValue;
            option.textContent = currentValue + ' (自定义)';
            option.selected = true;
            DOM.modelName.insertBefore(option, DOM.modelName.firstChild);
        }
        logToUI(`获取到 ${models.length} 个模型`);
    } catch (e) {
        alert(`获取模型列表失败: ${e.message}`);logToUI(`获取模型列表失败: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa fa-refresh"></i>';
    }
}

// 保存 API 设置
function saveApiSettings(e) {
    e.preventDefault();
    saveAllSettingsClick();
}
function saveAllSettingsClick() {
    appData.apiConfig = {
        ...appData.apiConfig,
        baseUrl: DOM.baseUrl.value.trim() || 'https://api.openai.com/v1',
        apiKey: DOM.apiKey.value.trim(),
        modelName: DOM.modelName.value.trim() || 'gpt-3.5-turbo',
        temperature: parseFloat(DOM.apiTemperature.value) || 0.7,
        historyTurns: parseInt(DOM.historyTurns.value, 10) || 0,
        diaryGenerationTurns: parseInt(DOM.diaryGenerationTurns.value, 10) || 0,
        globalSystemPrompt: DOM.globalSystemPrompt.value.trim() || '',
        imageGenBaseUrl: DOM.imageGenBaseUrl ? DOM.imageGenBaseUrl.value.trim() : '',
        imageGenApiKey: DOM.imageGenApiKey ? DOM.imageGenApiKey.value.trim() : '',
        imageGenModelName: DOM.imageGenModelName ? DOM.imageGenModelName.value.trim() : '',
        imageGenInterfaceType: (DOM.imageGenInterfaceImages && DOM.imageGenInterfaceImages.checked) ? 'images' : 'chat',
        auxBaseUrl: DOM.auxBaseUrl ? DOM.auxBaseUrl.value.trim() : '',
        auxApiKey: DOM.auxApiKey ? DOM.auxApiKey.value.trim() : '',
        auxModelName: DOM.auxModelName ? DOM.auxModelName.value.trim() : ''
    };
    appData.userInfo = { name: DOM.userName.value.trim() || 'user', avatar: { ...appData.userAvatarTempData } };
    saveDataToStorage();
    syncSettingsToExternal(); // ★ 同步到外部
    const btn = document.getElementById('saveAllSettingsBtn');
    if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa fa-check mr-2"></i>保存成功！';
        setTimeout(() => { btn.innerHTML = orig; togglePage('settings', false); }, 1500);
    }
}

// 日志相关
function showLogModal() { DOM.logOutput.value = appData.logs.join('\n'); DOM.logModal.classList.remove('hidden'); setTimeout(() => { DOM.logOutput.scrollTop = DOM.logOutput.scrollHeight; }, 100); }
function closeLogModal() { DOM.logModal.classList.add('hidden'); }
function clearLogs() { if (confirm('确定要清空所有诊断日志吗？')) { appData.logs = []; logToUI('日志已清空。'); if (!DOM.logModal.classList.contains('hidden')) { showLogModal(); } alert('日志已清空！'); } }


// 事件绑定
function setupEventListeners() {
    const eMap = {
        addChatBtn: { click: openAddChatModal },
        backToChatListBtn: { click: () => { DOM.chatPage.classList.add('hidden'); DOM.chatListPage.classList.remove('hidden') } },
        chatPageSendBtn: { click: sendChatMessage },
        chatPageMessageInput: {
            keydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } },
            input: (e) => { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px` }
        },
        chatPageMoreBtn: { click: () => { if (appData.activeChatId) openChatDetail(appData.activeChatId) } },
        settingsForm: { submit: saveApiSettings },
        refreshModelsBtn: { click: fetchModelList },
        userAvatarUpload: { change: handleUserAvatarUpload },
        userAvatarUrlBtn: { click: () => DOM.userAvatarUrlContainer.classList.toggle('hidden') },
        userAvatarUrlConfirm: { click: handleUserAvatarUrl },
        userAvatarUrlCancel: { click: () => DOM.userAvatarUrlContainer.classList.add('hidden') },
        closeAddChatModalBtn: { click: closeAddChatModal },
        newChatAvatarUpload: { change: handleNewChatAvatarUpload },
        newChatAvatarUrlBtn: { click: () => DOM.newChatAvatarUrlContainer.classList.toggle('hidden') },
        newChatAvatarUrlConfirm: { click: handleNewChatAvatarUrl },
        newChatAvatarUrlCancel: { click: () => DOM.newChatAvatarUrlContainer.classList.add('hidden') },
        createChatBtn: { click: createNewChat },
        backToChatPageBtn: { click: () => DOM.chatDetailPage.classList.add('translate-x-full') },
        deleteChatBtn: { click: () => { if (appData.editChatTempData.chatId) showConfirmDeleteModal(appData.editChatTempData.chatId) } },
        editAvatarBtn: { click: () => DOM.editAvatarContainer.classList.remove('hidden') },
        cancelEditAvatarBtn: { click: () => DOM.editAvatarContainer.classList.add('hidden') },
        editChatAvatarUpload: { change: handleEditChatAvatarUpload },
        editChatAvatarUrlBtn: { click: () => DOM.editChatAvatarUrlContainer.classList.toggle('hidden') },
        editChatAvatarUrlConfirm: { click: handleEditChatAvatarUrl },
        editChatAvatarUrlCancel: { click: () => DOM.editChatAvatarUrlContainer.classList.add('hidden') },
        saveChatDetailBtn: { click: saveChatDetail },
        cancelDeleteBtn: { click: hideConfirmDeleteModal },
        confirmDeleteBtn: { click: () => { if (appData.editChatTempData.chatId) deleteChat(appData.editChatTempData.chatId) } },
        regenerateMessageBtn: { click: () => { if (appData.contextMenuData.messageIndex !== null) regenerateAiResponse(appData.contextMenuData.messageIndex); DOM.messageContextMenu.classList.add('hidden') } },
        deleteMessageBtn: { click: () => { deleteMessage(appData.contextMenuData.messageIndex); DOM.messageContextMenu.classList.add('hidden') } },
        editMessageBtn: { click: () => { editMessage(appData.contextMenuData.messageIndex); DOM.messageContextMenu.classList.add('hidden') } },
        resendMessageBtn: { click: () => { resendMessage(appData.contextMenuData.messageIndex); DOM.messageContextMenu.classList.add('hidden') } },
        saveAllSettingsBtn: { click: saveAllSettingsClick },
        backupDataBtn: { click: backupData },
        restoreDataBtn: { click: triggerRestore },
        restoreFileInput: { change: handleRestoreFile },
        closeRestoreModalBtn: { click: closeRestoreModal },
        cancelRestoreBtn: { click: closeRestoreModal },
        confirmRestoreBtn: { click: confirmRestore },
        restoreSelectAll: { change: (e) => document.querySelectorAll('.restore-chat-item').forEach(cb => cb.checked = e.target.checked) },
        // 导航
        chatNavBtn: { click: () => { togglePage('chat', true) } },
        momentsNavBtn: { click: () => { togglePage('moments', true) } },
        diaryNavBtn: { click: () => { togglePage('diary', true) } },
        settingsNavBtn: { click: () => { togglePage('settings', true) } },
        closeSettingsBtn: { click: () => { togglePage('settings', false) } },
        closeMomentsPageBtn: { click: () => { togglePage('moments', false) } },
        closeDiaryListPageBtn: { click: () => { togglePage('diary', false) } },
        // 日记
        backToDiaryListBtn: { click: () => DOM.diaryDetailPage.classList.add('translate-x-full') },
        manualDiaryBtn: { click: manualGenerateDiary },
        resetDiaryPtrBtn: { click: resetDiaryPointer },
        viewLogsBtn: { click: showLogModal },
        clearLogsBtn: { click: clearLogs },
        closeLogModalBtn: { click: closeLogModal },
        closeEditDiaryModalBtn: { click: closeEditDiaryModal },
        cancelEditDiaryBtn: { click: closeEditDiaryModal },
        saveEditDiaryBtn: { click: saveDiaryEntry },
        //朋友圈功能事件
        openPublishMomentBtn: { click: openPublishMomentModal },
        closePublishMomentModalBtn: { click: closePublishMomentModal },
        publishModeAuto: { click: () => switchPublishMode('auto') },
        publishModeManual: { click: () => switchPublishMode('manual') },
        confirmPublishMomentBtn: { click: confirmPublishMoment },
        backToMomentsBtn: { click: closeMomentDetail },
        deleteMomentBtn: { click: deleteMoment },
        momentCommentSendBtn: { click: sendMomentComment },
        momentCommentInput: { keydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMomentComment(); } } },
        
        // 表情功能事件
        stickerToggleBtn: { click: toggleStickerPanel },
        emojiTabBtn: { click: () => switchStickerTab('emoji') },
        customStickerTabBtn: { click: () => switchStickerTab('custom') },
        addStickerUploadBtn: { click: () => openAddStickerModal('upload') },
        addStickerUrlBtn: { click: () => openAddStickerModal('url') },
        addStickerImportBtn: { click: () => openAddStickerModal('import') },
        closeAddStickerModalBtn: { click: closeAddStickerModal },
        cancelAddStickerBtn: { click: closeAddStickerModal },
        confirmAddStickerBtn: { click: saveSticker },
        stickerUploadPreviewBox: { click: () => DOM.stickerFileInput.click() },
        stickerFileInput: { change: (e) => handleStickerUpload(e.target.files[0]) },
        stickerUrlInput: { input: previewStickerUrl },
        stickerFullViewModal: { click: closeStickerFullView }
    };

    for (const id in eMap) {
        if (DOM[id]) {
            for (const ev in eMap[id]) {
                DOM[id].addEventListener(ev, eMap[id][ev]);
            }
        }
    }
    //朋友圈额外按钮绑定
    const publishBtn2 = document.getElementById('publishMomentBtn2');
    if (publishBtn2) publishBtn2.addEventListener('click', openPublishMomentModal);

    const npcFriendsBtn = document.getElementById('npcFriendsBtn');
    if (npcFriendsBtn) npcFriendsBtn.addEventListener('click', openNpcFriendsModal);

    const backFromMomentDetailBtn = document.getElementById('backFromMomentDetailBtn');
    if (backFromMomentDetailBtn) backFromMomentDetailBtn.addEventListener('click', closeMomentDetail);

    const sendMomentCommentBtn = document.getElementById('sendMomentCommentBtn');
    if (sendMomentCommentBtn) sendMomentCommentBtn.addEventListener('click', sendMomentComment);
    if (DOM.momentsChatSelector) {
        DOM.momentsChatSelector.addEventListener('change', () => {
            const chatId = DOM.momentsChatSelector.value;
            appData.momentsTempData.chatId = chatId;
            updatePublishModeByChat(chatId);
        });
    }
    
    // 通用模态框关闭
    [DOM.addChatModal, DOM.confirmDeleteModal, DOM.restoreModal, DOM.editDiaryEntryModal, DOM.logModal, DOM.addStickerModal, DOM.publishMomentModal, DOM.npcFriendsModal, DOM.aiSuggestFriendsModal].forEach(el => el && el.addEventListener('click', e => {
        if (e.target === el) el.classList.add('hidden')
    }));

    const modals = [DOM.addChatModal, DOM.confirmDeleteModal, DOM.restoreModal, DOM.editDiaryEntryModal, DOM.logModal, DOM.addStickerModal, DOM.publishMomentModal, DOM.npcFriendsModal, DOM.aiSuggestFriendsModal];
    modals.forEach(modal => {
        if (modal && modal.children) {
            [...modal.children].forEach(c => c.addEventListener('click', e => e.stopPropagation()));
        }
    });
    
    [DOM.settingsPage, DOM.chatDetailPage, DOM.diaryListPage, DOM.diaryDetailPage, DOM.momentsPage, DOM.momentDetailPage].forEach(c => c && c.addEventListener('click', e => e.stopPropagation()));

    // 右键菜单
    DOM.chatPageContainer.addEventListener('contextmenu', (e) => {
        const t = e.target.closest('[data-message-role]');
        if (t) {
            e.preventDefault();
            const role = t.dataset.messageRole;
            appData.contextMenuData.messageIndex = parseInt(t.dataset.messageIndex, 10);
            appData.contextMenuData.messageRole = role;
            DOM.regenerateMessageBtn.style.display = (role === 'assistant') ? 'block' : 'none';
            DOM.resendMessageBtn.style.display = (role === 'user') ? 'block' : 'none';
            DOM.messageContextMenu.style.left = `${e.clientX}px`;
            DOM.messageContextMenu.style.top = `${e.clientY}px`;
            DOM.messageContextMenu.classList.remove('hidden')
        }
    });

    DOM.emojiGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.emoji-item');
        if (btn) insertEmoji(btn.dataset.emoji);
    });

    DOM.stickerGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.sticker-item');
        const deleteBtn = e.target.closest('.delete-sticker-btn');
        if (deleteBtn) {
            e.stopPropagation();
            deleteSticker(deleteBtn.dataset.stickerId);
        } else if (item) {
            insertStickerCode(item.dataset.stickerName);
        }
    });

    document.addEventListener('click', (e) => {
        if (!DOM.stickerPanel.contains(e.target) && !DOM.stickerToggleBtn.contains(e.target)) {
            closeStickerPanel();
        }DOM.messageContextMenu.classList.add('hidden');
    });

    window.addEventListener('resize', adjustHeights);
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
