/* =========================================================================
   微信风格多AI聊天 - 数据存储模块 (storage.js)
   ========================================================================= */

// 默认配置
const aichat_default_config = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    historyTurns: 10,
    diaryGenerationTurns: 30,
    globalSystemPrompt: `请严格遵守以下规则：\n1. 你的所有思考、self-critique、计划、plan等内心戏都必须包含在 <think> 和 </think> 标签之间，且<think>标签必须在你的回答的最前面。\n2. 你必须在think之后再给出对用户的直接回答。\n3. 给用户的直接回答中绝对不能出现<think>标签及其中内容。`,
    imageGenBaseUrl: '',
    imageGenApiKey: '',
    imageGenModelName: '',
    imageGenInterfaceType: 'chat',
    auxBaseUrl: '',
    auxApiKey: '',
    auxModelName: '' 
};

// 全局应用数据
const appData = { 
    chatObjects: [], 
    activeChatId: null, 
    apiConfig: { ...aichat_default_config }, 
    userInfo: { name: 'user', avatar: { type: 'default', url: '' } }, 
    newChatTempData: { avatar: { type: 'default', url: '' } }, 
    editChatTempData: { chatId: null, avatar: { type: 'default', url: '' } }, 
    userAvatarTempData: { type: 'default', url: '' }, 
    contextMenuData: { messageIndex: null }, 
    restoreTempData: { zip: null, parsedChats: [] }, 
    diaryView: { activeChatId: null, editingEntryId: null }, 
    isGeneratingDiary: false, 
    logs: [],
    stickers: [],  // 表情图数据
    stickerTempData: { mode: 'upload', uploadData: null },  // 临时数据
moments: [],
    momentsTempData: { chatId: null, mode: 'auto', imageMode: 'ai' },
    momentDetailId: null,
    momentReplyTarget: null,
    momentsUnread: false,
    npcFriends: [],
    npcFriendTempData: {},
};

// 从本地存储加载所有数据
function loadDataFromStorage() {
    try {
        const storedObjects = localStorage.getItem('aiMultiChatObjects');
        appData.chatObjects = storedObjects ? JSON.parse(storedObjects).map(c => ({
            ...c, 
            messages: c.messages || [], 
            diaries: c.diaries || [], 
            lastDiaryIndex: c.lastDiaryIndex || 0,
            id: c.id || generateUniqueId() // 确保有ID
        })) : [];
        
        const storedConfig = JSON.parse(localStorage.getItem('aiMultiChatApiConfig') || '{}');
        appData.apiConfig = { ...aichat_default_config, ...storedConfig };
        
        const storedUser = localStorage.getItem('aiMultiChatUserInfo');
        appData.userInfo = storedUser ? ({...{ name: 'user', avatar: { type: 'default', url: '' } }, ...JSON.parse(storedUser) }) : { name: 'user', avatar: { type: 'default', url: '' } };
        
        appData.activeChatId = localStorage.getItem('aiMultiChatActiveId') || null;
        
        loadStickerData();  // 加载表情数据
        loadMomentsData();  // 新增：加载朋友圈数据
        loadNpcFriendsData();       
    } catch (e) {
        console.error("从localStorage加载数据失败:", e);
        alert("加载本地缓存数据失败，您的聊天记录可能已损坏。");
    }
}

// 保存数据到本地存储
function saveDataToStorage() {
    try {
        localStorage.setItem('aiMultiChatObjects', JSON.stringify(appData.chatObjects));
        localStorage.setItem('aiMultiChatApiConfig', JSON.stringify(appData.apiConfig));
        localStorage.setItem('aiMultiChatUserInfo', JSON.stringify(appData.userInfo));
        if (appData.activeChatId) {
            localStorage.setItem('aiMultiChatActiveId', appData.activeChatId);

        }
    } catch (e) {
        console.error("保存数据到localStorage失败:", e);
        alert("保存数据失败，可能是由于存储空间已满。");
    }
	// 在saveDataToStorage 函数末尾添加
    if (typeof syncSettingsToExternal === 'function') syncSettingsToExternal();	
}

// 加载UI数据 (填充设置页面的表单)
function loadUIData() {
    const DOM = window.DOM || {}; // DOM在 app.js 中初始化，这里使用全局引用

    Object.keys(appData.apiConfig).forEach(k => {
        if (DOM[k] && k !== 'modelName') DOM[k].value = appData.apiConfig[k];
    });
// 特殊处理：temperature 在 config 中叫 temperature，但 DOM ID 是 apiTemperature
if (DOM.apiTemperature) {
    DOM.apiTemperature.value = appData.apiConfig.temperature;
}

    const savedModel = appData.apiConfig.modelName || 'gpt-3.5-turbo';
    DOM.modelName.innerHTML = '';
    const option = document.createElement('option');
    option.value = savedModel;
    option.textContent = savedModel;
    DOM.modelName.appendChild(option);
    DOM.modelName.value = savedModel;
    if (DOM.imageGenBaseUrl) DOM.imageGenBaseUrl.value = appData.apiConfig.imageGenBaseUrl || '';
    if (DOM.imageGenApiKey) DOM.imageGenApiKey.value = appData.apiConfig.imageGenApiKey || '';
    if (DOM.imageGenModelName) DOM.imageGenModelName.value = appData.apiConfig.imageGenModelName || '';
    if (DOM.imageGenInterfaceChat) DOM.imageGenInterfaceChat.checked = (appData.apiConfig.imageGenInterfaceType !== 'images');
    if (DOM.imageGenInterfaceImages) DOM.imageGenInterfaceImages.checked = (appData.apiConfig.imageGenInterfaceType === 'images');
    if (DOM.auxBaseUrl) DOM.auxBaseUrl.value = appData.apiConfig.auxBaseUrl || '';
    if (DOM.auxApiKey) DOM.auxApiKey.value = appData.apiConfig.auxApiKey || '';
    if (DOM.auxModelName) DOM.auxModelName.value = appData.apiConfig.auxModelName || '';
    DOM.userName.value = appData.userInfo.name;
    appData.userAvatarTempData = { ...appData.userInfo.avatar };
    updateUserAvatarPreview();
}

// 备份数据 (导出ZIP)
async function backupData() {
    const btn = DOM.backupDataBtn;
    const originalText = btn.querySelector('span').textContent;
    btn.disabled = true;
    btn.querySelector('span').textContent = '加载组件...';
    try {
        await loadJSZip();  // 此函数在 utils.js
        btn.querySelector('span').textContent = '正在备份...';
        const zip = new JSZip();
        
        // 1. 备份全局设置
        const globalsFolder = zip.folder('_globals');
        const userInfoToSave = { name: appData.userInfo.name };
        globalsFolder.file('settings.json', JSON.stringify({ apiConfig: appData.apiConfig, userInfo: userInfoToSave }, null, 2));

        // 2. 备份表情数据
        if (appData.stickers.length > 0) {
            globalsFolder.file('stickers.json', JSON.stringify(appData.stickers, null, 2));
        }

        // 3. 备份用户头像
        if (appData.userInfo.avatar && appData.userInfo.avatar.type !== 'default' && appData.userInfo.avatar.url) {
            try {
                let avatarBlob;
                if (appData.userInfo.avatar.url.startsWith('data:image')) {
                    avatarBlob = dataURLtoBlob(appData.userInfo.avatar.url);
                } else {
                    const response = await fetch(appData.userInfo.avatar.url);
                    avatarBlob = await response.blob();
                }
                const extension = avatarBlob.type.split('/')[1] || 'png';
                globalsFolder.file(`user_avatar.${extension}`, avatarBlob);
            } catch (e) {
                console.error("备份用户头像失败:", e);
                logToUI(`备份用户头像失败: ${e.message}`);
            }
        }
        // 3.5 备份朋友圈数据
        if (appData.moments.length > 0) {
            globalsFolder.file('moments.json', JSON.stringify(appData.moments, null, 2));
        }
        // 3.6 备份NPC好友数据
        if (appData.npcFriends.length > 0) {
            globalsFolder.file('npcFriends.json', JSON.stringify(appData.npcFriends, null, 2));
        }

        // 3.7 备份IndexedDB图片
        try {
            const allImages = await getAllImagesFromDB();
            if (allImages.length > 0) {
                const imagesFolder = globalsFolder.folder('images');
                for (const img of allImages) {
                    imagesFolder.file(img.id + '.txt', img.data);
                }
            }
        } catch (e) {
            logToUI(`备份图片失败: ${e.message}`);
        }
        // 4. 备份每个聊天对象
        for (const chat of appData.chatObjects) {
            const chatFolder = zip.folder(chat.id);
            const chatDataToSave = { 
                id: chat.id, 
                name: chat.name, 
                systemPrompt: chat.systemPrompt, 
                messages: chat.messages, 
                diaries: chat.diaries, 
                lastDiaryIndex: chat.lastDiaryIndex, 
                createdAt: chat.createdAt 
            };
            chatFolder.file('history.json', JSON.stringify(chatDataToSave, null, 2));

            if (chat.avatar && chat.avatar.type !== 'default' && chat.avatar.url) {
                try {
                    let avatarBlob;
                    if (chat.avatar.url.startsWith('data:image')) {
                        avatarBlob = dataURLtoBlob(chat.avatar.url);
                    } else {
                        const response = await fetch(chat.avatar.url);
                        avatarBlob = await response.blob();
                    }
                    const extension = avatarBlob.type.split('/')[1] || 'png';
                    chatFolder.file(`avatar.${extension}`, avatarBlob);
                } catch (e) {
                    console.error(`备份聊天 [${chat.name}] 的头像失败:`, e);
                    logToUI(`备份聊天 [${chat.name}] 的头像失败: ${e.message}`);
                }
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        const filename = `WeChat-AI-Backup-${timestamp}.zip`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        alert(`备份成功！文件已保存为 ${filename}，请在您浏览器的“下载”文件夹中查看。`);
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = originalText;
    }
}

// 恢复数据 (触发文件选择)
async function triggerRestore() {
    const btn = DOM.restoreDataBtn;
    const originalText = btn.querySelector('span').textContent;
    btn.disabled = true;
    btn.querySelector('span').textContent = '加载组件...';
    try {
        await loadJSZip();
        DOM.restoreFileInput.click();
    } catch (error) {
        alert(error.message);
    } finally {
        btn.disabled = false;
        btn.querySelector('span').textContent = originalText;
    }
}

// 处理恢复的文件 (解析ZIP)
async function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const zip = await JSZip.loadAsync(file);
        appData.restoreTempData.zip = zip;
        appData.restoreTempData.parsedChats = [];
        
        const directories = Object.keys(zip.files).filter(path => path.endsWith('/') && path.indexOf('/') === path.length - 1);
        
        for (const dirPath of directories) {
            if (dirPath === '_globals/') continue;
            const historyFile = zip.file(`${dirPath}history.json`);
            if (historyFile) {
                const historyContent = await historyFile.async('string');
                const chatData = JSON.parse(historyContent);
                appData.restoreTempData.parsedChats.push({ id: chatData.id, name: chatData.name });
            }
        }
        
        if (appData.restoreTempData.parsedChats.length === 0) {
            alert('这个备份文件里没有找到有效的聊天记录。');
        } else {
            showRestoreModal();
        }
    } catch (e) {
        alert('无法读取或解析备份文件。请确保文件未损坏且格式正确。');
        console.error("恢复文件解析失败:", e);
        logToUI(`恢复文件解析失败: ${e.message}`);
    } finally {
        DOM.restoreFileInput.value = '';
    }
}

// 确认恢复 (将解析的数据应用到 appData)
async function confirmRestore() {
    const selectedIds = Array.from(document.querySelectorAll('.restore-chat-item:checked')).map(cb => cb.dataset.chatId);
    if (selectedIds.length === 0) {
        alert('请至少选择一个聊天对象进行恢复。');
        return;
    }
    
    const zip = appData.restoreTempData.zip;
    try {
        const settingsFile = zip.file('_globals/settings.json');
        if (settingsFile) {
            const settingsContent = await settingsFile.async('string');
            const { apiConfig, userInfo } = JSON.parse(settingsContent);
            appData.apiConfig = { ...appData.apiConfig, ...apiConfig };
            appData.userInfo.name = userInfo.name;

            // 恢复表情数据
            const stickersFile = zip.file('_globals/stickers.json');
            if (stickersFile) {
                try {
                    const stickersContent = await stickersFile.async('string');
                    appData.stickers = JSON.parse(stickersContent);
                    saveStickerData();
                    logToUI(`成功恢复 ${appData.stickers.length} 个表情`);
                } catch (e) {
                    logToUI(`恢复表情数据失败: ${e.message}`);
                }
            }
              // 恢复朋友圈数据
            const momentsFile = zip.file('_globals/moments.json');
            if (momentsFile) {
                try {
                    const momentsContent = await momentsFile.async('string');
                    appData.moments = JSON.parse(momentsContent);
                    saveMomentsData();
                    logToUI(`成功恢复 ${appData.moments.length} 条朋友圈动态`);
                } catch (e) {
                    logToUI(`恢复朋友圈数据失败: ${e.message}`);
                }
            } 
             // 恢复NPC好友数据
            const npcFriendsFile = zip.file('_globals/npcFriends.json');
            if (npcFriendsFile) {
                try {
                    const npcContent = await npcFriendsFile.async('string');
                    appData.npcFriends = JSON.parse(npcContent);
                    saveNpcFriendsData();
                    logToUI(`成功恢复 ${appData.npcFriends.length} 个NPC好友`);
                } catch (e) {
                    logToUI(`恢复NPC好友数据失败: ${e.message}`);
                }
            }

            // 恢复IndexedDB图片
            const imagesFolder = zip.folder('_globals/images');
            if (imagesFolder) {
                try {
                    let imgCount = 0;
                    const imageFiles = Object.keys(zip.files).filter(p => p.startsWith('_globals/images/') && p.endsWith('.txt'));
                    for (const imgPath of imageFiles) {
                        const imgFile = zip.file(imgPath);
                        if (imgFile) {
                            const imgData = await imgFile.async('string');
                            const imgId = imgPath.split('/').pop().replace('.txt', '');
                            await saveImageToDB(imgId, imgData);
                            imgCount++;
                        }
                    }
                    if (imgCount > 0) logToUI(`成功恢复 ${imgCount} 张图片`);
                } catch (e) {
                    logToUI(`恢复图片失败: ${e.message}`);
                }
            }                    
            
            const userAvatarFile = zip.file(/_globals\/user_avatar\.(png|jpg|jpeg|gif|webp)$/)[0];
            if (userAvatarFile) {
                const avatarBlob = await userAvatarFile.async('blob');
                appData.userInfo.avatar = { type: 'upload', url: await blobToDataURL(avatarBlob) };
            } else {
                appData.userInfo.avatar = { type: 'default', url: '' };
            }
        }
        
        for (const chatId of selectedIds) {
            const chatDir = `${chatId}/`;
            const historyFile = zip.file(`${chatDir}history.json`);
            if (!historyFile) continue;
            
            const chatData = JSON.parse(await historyFile.async('string'));
            const chatAvatarFile = zip.file(new RegExp(`^${chatDir}avatar\\.(png|jpg|jpeg|gif|webp)$`))[0];
            
            if (chatAvatarFile) {
                const avatarBlob = await chatAvatarFile.async('blob');
                chatData.avatar = { type: 'upload', url: await blobToDataURL(avatarBlob) };
            } else {
                chatData.avatar = { type: 'default', url: '' };
            }
            
            chatData.diaries = chatData.diaries || [];
            chatData.lastDiaryIndex = chatData.lastDiaryIndex || 0;
            
            const existingIndex = appData.chatObjects.findIndex(c => c.id === chatId);
            if (existingIndex !== -1) {
                appData.chatObjects[existingIndex] = chatData;
            } else {
                appData.chatObjects.push(chatData);
            }
        }
        
        saveDataToStorage();
        loadUIData();
        renderChatList();
        renderStickerGrid();  // 在 stickers.js 中定义
        if (typeof renderMomentsList === 'function' && isMomentsPageVisible()) renderMomentsList();       
        if (isDiaryPageVisible()) renderDiaryList();
        
        alert(`成功恢复了 ${selectedIds.length} 个聊天和全局设置！`);
        closeRestoreModal();
    } catch (e) {
        alert('恢复过程中发生错误。');
        console.error("恢复失败：", e);
        logToUI(`恢复失败: ${e.message}`);
    }
}

// 辅助函数: 显示恢复模态框
function showRestoreModal() {
    DOM.restoreChatList.innerHTML = '';
    appData.restoreTempData.parsedChats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `<label class="flex items-center space-x-3 cursor-pointer w-full p-1 hover:bg-wechat-gray rounded">
            <input type="checkbox" data-chat-id="${chat.id}" class="restore-chat-item rounded border-gray-300 text-wechat-green focus:ring-wechat-green">
            <span class="text-wechat-text">${escapeHtml(chat.name)}</span>
        </label>`;
        DOM.restoreChatList.appendChild(div);
    });
    DOM.restoreSelectAll.checked = false;
    DOM.restoreModal.classList.remove('hidden');
}

function closeRestoreModal() {
    DOM.restoreModal.classList.add('hidden');
    appData.restoreTempData = { zip: null, parsedChats: [] };
}
