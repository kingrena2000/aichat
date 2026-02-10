/* =========================================================================
   微信风格多AI聊天 - 朋友圈功能模块 (moments.js)
   ========================================================================= */

// ==================== IndexedDB 图片存储 ====================

const IDB_NAME = 'AIChatImageStore';
const IDB_VERSION = 1;
const IDB_STORE = 'images';

function openImageDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveImageToDB(id, dataUrl) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ id, data: dataUrl, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function getImageFromDB(id) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).get(id);
        request.onsuccess = () => resolve(request.result ? request.result.data : null);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function deleteImageFromDB(id) {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function getAllImagesFromDB() {
    const db = await openImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const request = tx.objectStore(IDB_STORE).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 解析图片引用：idb://xxx 从IndexedDB加载，普通URL直接用
async function resolveImageUrl(ref) {
    if (!ref) return '';
    if (ref.startsWith('idb://')) {
        const id = ref.substring(6);
        try {
            const data = await getImageFromDB(id);
            return data || '';
        } catch (e) {
            console.error('从IndexedDB加载图片失败:', e);
            return '';
        }
    }
    return ref;
}

// ==================== 数据存取 ====================

function loadMomentsData() {
    try {
        const stored = localStorage.getItem('aiMultiChatMoments');
        appData.moments = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('加载朋友圈数据失败:', e);
        appData.moments = [];
    }
}

function saveMomentsData() {
    try {
        localStorage.setItem('aiMultiChatMoments', JSON.stringify(appData.moments));
    } catch (e) {
        console.error('保存朋友圈数据失败:', e);
        alert('保存朋友圈数据失败，可能存储空间不足。');
    }
}

function loadNpcFriendsData() {
    try {
        const stored = localStorage.getItem('aiMultiChatNpcFriends');
        appData.npcFriends = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('加载NPC好友数据失败:', e);
        appData.npcFriends = [];
    }
}

function saveNpcFriendsData() {
    try {
        localStorage.setItem('aiMultiChatNpcFriends', JSON.stringify(appData.npcFriends));
    } catch (e) {
        console.error('保存NPC好友数据失败:', e);
    }
}

function isMomentsPageVisible() {
    return DOM.momentsPage && !DOM.momentsPage.classList.contains('translate-x-full');
}

// ==================== 辅助API调用 ====================

function getAuxApiConfig() {
    const cfg = appData.apiConfig;
    return {
        baseUrl: cfg.auxBaseUrl || cfg.baseUrl,
        apiKey: cfg.auxApiKey || cfg.apiKey,
        modelName: cfg.auxModelName || cfg.modelName
    };
}

function getImageGenApiConfig() {
    const cfg = appData.apiConfig;
    return {
        baseUrl: cfg.imageGenBaseUrl || cfg.baseUrl,
        apiKey: cfg.imageGenApiKey || cfg.apiKey,
        modelName: cfg.imageGenModelName,
        interfaceType: cfg.imageGenInterfaceType || 'chat'
    };
}

async function callAuxApi(messages, temperature) {
    const aux = getAuxApiConfig();
    if (!aux.apiKey) throw new Error('未配置API Key');
    const data = await fetchWithRetry(`${aux.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aux.apiKey}` },
        body: JSON.stringify({
            model: aux.modelName,
            messages: messages,
            temperature: temperature || 0.8
        })
    });
    return data.choices[0].message.content;
}

// ==================== AI生图 ====================

async function generateImageByAI(prompt) {
    const imgCfg = getImageGenApiConfig();
    if (!imgCfg.modelName || !imgCfg.apiKey) {
        logToUI('[生图] 未配置生图模型名或API Key，跳过');
        return null;
    }

    logToUI(`[生图] 开始生成，模型: ${imgCfg.modelName}, 接口: ${imgCfg.interfaceType}`);
    logToUI(`[生图] Prompt: ${prompt.substring(0, 100)}...`);

    try {
        if (imgCfg.interfaceType === 'images') {
            // /images/generations 端点 (DALL-E)
            logToUI('[生图] 使用 /images/generations 端点');
            const reqBody = {
                model: imgCfg.modelName,
                prompt: prompt,
                n: 1,
                response_format: 'b64_json'
            };
            const data = await fetchWithRetry(`${imgCfg.baseUrl}/images/generations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${imgCfg.apiKey}` },
                body: JSON.stringify(reqBody)
            });
            logToUI(`[生图] images端点返回keys: ${Object.keys(data).join(',')}`);
            if (data.data && data.data[0]) {
                if (data.data[0].b64_json) {
                    logToUI('[生图] 成功获取 b64_json 图片');
                    return `data:image/png;base64,${data.data[0].b64_json}`;
                }
                if (data.data[0].url) {
                    logToUI('[生图] 成功获取图片URL');
                    return data.data[0].url;
                }
            }
            logToUI('[生图] images端点未返回有效图片数据');
        } else {
            // /chat/completions 端点 (Gemini/GPT-4o 等)
            logToUI('[生图] 使用 /chat/completions 端点');

            // 构造请求体 - 尝试多种兼容格式
            const reqBody = {
                model: imgCfg.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.8
            };

            // 不同API转发商对图片生成的参数名不同，都加上
            reqBody.modalities = ['text', 'image'];
            // 有些转发商用 response_format
            // reqBody.response_format = { type: 'image' };

            logToUI(`[生图] 请求体: ${JSON.stringify(reqBody).substring(0, 300)}...`);

            const data = await fetchWithRetry(`${imgCfg.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${imgCfg.apiKey}` },
                body: JSON.stringify(reqBody)
            });

            const msg = data.choices && data.choices[0] && data.choices[0].message;
            if (!msg) {
                logToUI('[生图] API返回中没有 choices[0].message');
                logToUI(`[生图] 完整返回: ${JSON.stringify(data).substring(0, 500)}`);
                return null;
            }

            logToUI(`[生图] message keys: ${Object.keys(msg).join(',')}`);
            logToUI(`[生图] content type: ${typeof msg.content}, isArray: ${Array.isArray(msg.content)}`);

            // 格式1: msg.images 数组 (部分API)
            if (msg.images && msg.images.length > 0) {
                logToUI(`[生图] 检测到 msg.images，数量: ${msg.images.length}`);
                const imgData = msg.images[0];
                if (imgData.image_url && imgData.image_url.url) return imgData.image_url.url;
                if (imgData.url) return imgData.url;
                if (typeof imgData === 'string' && imgData.startsWith('data:image')) return imgData;
            }

            // 格式2: msg.content 是数组（多模态返回，OpenAI/Gemini兼容格式）
            if (Array.isArray(msg.content)) {
                logToUI(`[生图] content是数组，${msg.content.length}个元素`);
                for (const part of msg.content) {
                    logToUI(`[生图] 元素type: ${part.type}`);
                    if (part.type === 'image_url' && part.image_url && part.image_url.url) {
                        logToUI('[生图] 从content数组中获取到image_url');
                        return part.image_url.url;
                    }
                    // 有些格式用 inline_data
                    if (part.type === 'image' && part.source && part.source.data) {
                        logToUI('[生图] 从content数组中获取到inline_data');
                        return `data:image/${part.source.media_type || 'png'};base64,${part.source.data}`;
                    }
                }
            }

            // 格式3: msg.content 是字符串 - 尝试提取 base64 / URL
            const textContent = typeof msg.content === 'string' ? msg.content : 
                               (Array.isArray(msg.content) ? msg.content.filter(p => p.type === 'text').map(p => p.text).join('') : '');
            
            if (textContent) {
                logToUI(`[生图] 文本内容(前200字): ${textContent.substring(0, 200)}`);

                // 尝试提取 base64 图片
                const b64Match = textContent.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
                if (b64Match) {
                    logToUI('[生图] 从文本中提取到base64图片');
                    return b64Match[0];
                }

                // 尝试提取 markdown 图片链接 ![xxx](url)
                const mdImgMatch = textContent.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
                if (mdImgMatch) {
                    logToUI(`[生图] 从markdown中提取到图片URL: ${mdImgMatch[1].substring(0, 80)}`);
                    return mdImgMatch[1];
                }

                // 尝试提取裸URL
                const urlMatch = textContent.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|bmp))/i);
                if (urlMatch) {
                    logToUI(`[生图] 从文本中提取到图片URL: ${urlMatch[1].substring(0, 80)}`);
                    return urlMatch[1];
                }

                logToUI('[生图] 模型返回了纯文字，未包含图片数据。该模型可能不支持图片生成。');
            }
        }
    } catch (e) {
        console.error('AI生图失败:', e);
        logToUI(`[生图] 失败: ${e.message}`);
    }
    return null;
}
// 将base64图片保存到IndexedDB并返回引用ID
async function saveGeneratedImage(dataUrl) {
    if (!dataUrl) return dataUrl;
    // 如果是普通URL（不是base64），直接返回
    if (!dataUrl.startsWith('data:image')) return dataUrl;
    const imgId = 'img_' + generateUniqueId();
    try {
        await saveImageToDB(imgId, dataUrl);
        logToUI('[生图] 图片已保存到IndexedDB, id: ' + imgId);
        return 'idb://' + imgId;
    } catch (e) {
        console.error('保存图片到IndexedDB失败:', e);
        logToUI('[生图] 保存图片到IndexedDB失败: ' + e.message + '，将直接使用base64');
        return dataUrl; // 降级：直接返回base64字符串
    }
}
// ==================== 工具函数 ====================

function refreshMomentsChatSelector() {
    if (!DOM.momentsChatSelector) return;
    const currentValue = DOM.momentsChatSelector.value;
    DOM.momentsChatSelector.innerHTML = '<option value="__user__">我</option>';
    appData.chatObjects.forEach(chat => {
        const opt = document.createElement('option');
        opt.value = chat.id;
        opt.textContent = chat.name;
        if (chat.id === currentValue) opt.selected = true;
        DOM.momentsChatSelector.appendChild(opt);
    });
}

function updateMomentsCover() {
    if (!DOM.momentsUserName || !DOM.momentsUserAvatar) return;
    DOM.momentsUserName.textContent = appData.userInfo.name || '我';
    if (appData.userInfo.avatar && appData.userInfo.avatar.type !== 'default' && appData.userInfo.avatar.url) {
        DOM.momentsUserAvatar.innerHTML = `<img src="${escapeHtml(appData.userInfo.avatar.url)}" alt="头像">`;
    } else {
        DOM.momentsUserAvatar.innerHTML = '<i class="fa fa-user"></i>';
    }
}

function getChatAvatarHtml(chat) {
    if (chat && chat.avatar && chat.avatar.type !== 'default' && chat.avatar.url) {
        return `<img src="${escapeHtml(chat.avatar.url)}" alt="${escapeHtml(chat.name)}">`;
    }
    return '<i class="fa fa-robot"></i>';
}

function getUserAvatarHtml() {
    if (appData.userInfo.avatar && appData.userInfo.avatar.type !== 'default' && appData.userInfo.avatar.url) {
        return `<img src="${escapeHtml(appData.userInfo.avatar.url)}" alt="我">`;
    }
    return '<i class="fa fa-user"></i>';
}

function getMomentPublisherInfo(moment) {
    if (moment.chatId === '__user__') {
        return { name: appData.userInfo.name || '我', avatarHtml: getUserAvatarHtml(), isUser: true };
    }
    const chat = appData.chatObjects.find(c => c.id === moment.chatId);
    return { name: chat ? chat.name : '未知角色', avatarHtml: getChatAvatarHtml(chat), isUser: false, chat: chat };
}

function getCommentAuthorInfo(comment, momentChatId) {
    if (comment.role === 'user') {
        return { name: appData.userInfo.name || '我', avatarHtml: getUserAvatarHtml(), avatarClass: 'user-type' };
    }
    if (comment.npcFriendId) {
        const friend = appData.npcFriends.find(f => f.id === comment.npcFriendId);
        const name = friend ? friend.name : (comment.authorName || '好友');
        return { name, avatarHtml: '<i class="fa fa-user"></i>', avatarClass: 'npc-type' };
    }
    if (comment.chatId) {
        const chat = appData.chatObjects.find(c => c.id === comment.chatId);
        return { name: chat ? chat.name : (comment.authorName || '未知'), avatarHtml: getChatAvatarHtml(chat), avatarClass: 'ai-type' };
    }
    // 临时好友（搜索/虚构的）
    if (comment.authorName) {
        return { name: comment.authorName, avatarHtml: '<i class="fa fa-user"></i>', avatarClass: 'npc-type' };
    }
    const chat = appData.chatObjects.find(c => c.id === momentChatId);
    return { name: chat ? chat.name : '未知', avatarHtml: getChatAvatarHtml(chat), avatarClass: 'ai-type' };
}

function formatMomentTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function getRelatedFriends(chatId) {
    return appData.npcFriends.filter(f => !f.bindChatId || f.bindChatId === chatId);
}

// ==================== 小红点 ====================

function setMomentsUnread(val) {
    appData.momentsUnread = val;
    const badge = document.getElementById('momentsBadge');
    if (badge) badge.style.display = val ? 'block' : 'none';
}

function clearMomentsUnread() {
    setMomentsUnread(false);
}

// ==================== 好友搜索/虚构 ====================

// 获取角色的临时好友（带滚动缓存）
function getTempFriendsCache(chat) {
    if (!chat.tempFriendsCache) return null;
    const cache = chat.tempFriendsCache;
    // 超过168小时过期
    if (Date.now() - cache.createdAt > 168 * 60 * 60 * 1000) return null;
    // 使用次数超过5次过期
    if (cache.useCount >= 5) return null;
    return cache;
}

function setTempFriendsCache(chat, friends) {
    chat.tempFriendsCache = {
        friends: friends,
        createdAt: Date.now(),
        useCount: 0
    };
    saveDataToStorage();
}

function incrementTempFriendsCacheUse(chat) {
    if (chat.tempFriendsCache) {
        chat.tempFriendsCache.useCount = (chat.tempFriendsCache.useCount || 0) + 1;
        saveDataToStorage();
    }
}

// 尝试搜索同人好友，失败则虚构
async function getOrCreateTempFriends(chat) {
    // 先检查缓存
    const cached = getTempFriendsCache(chat);
    if (cached) {
        incrementTempFriendsCacheUse(chat);
        return cached.friends;
    }

    // 尝试搜索同人好友
    try {
        const searchPrompt = `以下是一个角色的人物设定描述：

"""
${chat.systemPrompt.substring(0, 1500)}
"""

请根据以上人设，判断这个角色可能来自哪部作品（动漫、游戏、小说等），并列出2-3个该角色在原作中的朋友、同伴或关系密切的角色。

请严格按以下格式回复（每行一个）：
名字|与该角色的关系|性格特点

如果无法判断角色来源或这是一个原创角色，请只回复：无法确定`;

        const result = await callAuxApi([{ role: 'user', content: searchPrompt }], 0.5);
        const cleaned = cleanAiResponse(result);

        if (cleaned && !cleaned.includes('无法确定') && !cleaned.includes('无法判断') && !cleaned.includes('不确定')) {
            const friends = parseListedFriends(cleaned);
            if (friends.length > 0) {
                logToUI(`为 [${chat.name}] 搜索到 ${friends.length} 个同人好友`);
                setTempFriendsCache(chat, friends);
                return friends;
            }
        }
    } catch (e) {
        logToUI(`搜索同人好友失败: ${e.message}`);
    }

    // 降级：虚构好友
    try {
        const fictPrompt = `以下是一个角色的人物设定描述：

"""
${chat.systemPrompt.substring(0, 1000)}
"""

请为这个角色虚构2-3个合理的朋友角色，这些朋友应该符合该角色的背景设定。

请严格按以下格式回复（每行一个）：
名字|与该角色的关系|性格特点`;

        const result = await callAuxApi([{ role: 'user', content: fictPrompt }], 0.9);
        const cleaned = cleanAiResponse(result);
        const friends = parseListedFriends(cleaned);

        if (friends.length > 0) {
            logToUI(`为 [${chat.name}] 虚构了 ${friends.length} 个好友`);
            setTempFriendsCache(chat, friends);
            return friends;
        }
    } catch (e) {
        logToUI(`虚构好友失败: ${e.message}`);
    }

    return [];
}

// 解析 "名字|关系|性格" 格式
function parseListedFriends(text) {
    const lines = text.split('\n').filter(l => l.trim() && l.includes('|'));
    const friends = [];
    for (const line of lines) {
        const parts = line.split('|').map(s => s.trim());
        if (parts.length >= 2 && parts[0]) {
            friends.push({
                name: parts[0].replace(/^\d+[\.\、\)]\s*/, ''),
                relationship: parts[1] || '朋友',
                personality: parts[2] || ''
            });
        }
    }
    return friends.slice(0, 5);
}

// ==================== 渲染朋友圈列表 ====================

async function renderMomentsList() {
    if (!DOM.momentsListContainer) return;
    updateMomentsCover();
    refreshMomentsChatSelector();

    if (appData.moments.length === 0) {
        DOM.momentsListContainer.innerHTML = `<div class="moment-empty">
            <i class="fa fa-camera-retro"></i>
            <p>朋友圈还没有动态<br>选择一个角色或"我"，发条朋友圈吧</p>
        </div>`;
        return;
    }

    const sorted = [...appData.moments].sort((a, b) => b.timestamp - a.timestamp);
    let html = '';

    for (const moment of sorted) {
        const publisher = getMomentPublisherInfo(moment);
        const isLiked = moment.likes && moment.likes.includes('__user__');
        const likeCount = moment.likes ? moment.likes.length : 0;

        let imagesHtml = '';
        if (moment.images && moment.images.length > 0) {
            const validRefs = moment.images.filter(u => u && u.trim());
            if (validRefs.length > 0) {
                const cols = validRefs.length === 1 ? 'cols-1' : (validRefs.length <= 4 ? 'cols-2' : 'cols-3');
                const imgItems = [];
                for (const ref of validRefs.slice(0, 9)) {
                    const isIdb = ref.startsWith('idb://');
                    if (isIdb) {
    imgItems.push(`<div class="moment-image-item"><img data-idb-ref="${escapeHtml(ref)}" class="idb-loading" loading="lazy"></div>`);
}
 else {
                        imgItems.push(`<div class="moment-image-item" onclick="previewMomentImage('${escapeHtml(ref)}')"><img src="${escapeHtml(ref)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`);
                    }
                }
                imagesHtml = `<div class="moment-images ${cols}">${imgItems.join('')}</div>`;
            }
        }

        let interactionsHtml = '';
        const hasLikes = likeCount > 0;
        const hasComments = moment.comments && moment.comments.length > 0;
        if (hasLikes || hasComments) {
            let likesHtml = '';
            if (hasLikes) {
                const likeNames = moment.likes.map(id => {
                    if (id === '__user__') return appData.userInfo.name || '我';
                    const c = appData.chatObjects.find(ch => ch.id === id);
                    if (c) return c.name;
                    const f = appData.npcFriends.find(fr => fr.id === id);
                    return f ? f.name : '未知';
                });
                likesHtml = `<div class="moment-likes"><i class="fa fa-heart"></i> ${likeNames.map(n => escapeHtml(n)).join('，')}</div>`;
            }
            let commentsHtml = '';
            if (hasComments) {
                const previewComments = moment.comments.slice(0, 3).map(c => {
                    const author = getCommentAuthorInfo(c, moment.chatId);
                    const replyTag = c.replyTo ? `<span class="moment-comment-reply-tag">回复</span><span class="moment-comment-reply-name">${escapeHtml(c.replyToName || '')}</span>：` : '';
                    return `<div class="moment-comment-item"><span class="moment-comment-author">${escapeHtml(author.name)}</span>：${replyTag}<span class="moment-comment-text">${escapeHtml(c.content.substring(0, 50))}${c.content.length > 50 ? '...' : ''}</span></div>`;
                }).join('');

                let expandHtml = '';
                if (moment.comments.length > 3) {
                    const allComments = moment.comments.map(c => {
                        const author = getCommentAuthorInfo(c, moment.chatId);
                        const replyTag = c.replyTo ? `<span class="moment-comment-reply-tag">回复</span><span class="moment-comment-reply-name">${escapeHtml(c.replyToName || '')}</span>：` : '';
                        return `<div class="moment-comment-item"><span class="moment-comment-author">${escapeHtml(author.name)}</span>：${replyTag}<span class="moment-comment-text">${escapeHtml(c.content)}</span></div>`;
                    }).join('');

                    expandHtml = `
                        <div class="moment-comments-expanded" id="commentsExpand_${moment.id}" style="display:none;">${allComments}</div>
                        <div class="moment-comment-item moment-comments-toggle" id="commentsToggle_${moment.id}" style="color:#576b95;cursor:pointer;" onclick="toggleInlineComments('${moment.id}')">
                            查看全部${moment.comments.length}条评论
                        </div>`;
                }

                commentsHtml = `<div class="moment-comments">
                    <div class="moment-comments-preview" id="commentsPreview_${moment.id}">${previewComments}</div>
                    ${expandHtml}
                </div>`;
            }
            interactionsHtml = `<div class="moment-interactions">${likesHtml}${commentsHtml}</div>`;
        }

        const parsedContent = typeof parseMessageStickers === 'function' ? parseMessageStickers(moment.content) : escapeHtml(moment.content);

        html += `<div class="moment-item" data-moment-id="${moment.id}">
            <div class="moment-header">
                <div class="moment-avatar ${publisher.isUser ? 'user-moment-avatar' : ''}">${publisher.avatarHtml}</div>
                <div class="moment-info">
                    <div class="moment-author">${escapeHtml(publisher.name)}</div>
                    <div class="moment-content">${parsedContent}</div>
                    ${imagesHtml}
                    <div class="moment-footer">
                        <span class="moment-time">${formatMomentTime(moment.timestamp)}</span>
                        <div class="moment-actions">
                            <button class="moment-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleMomentLike('${moment.id}')">
                                <i class="fa fa-heart${isLiked ? '' : '-o'}"></i> ${likeCount > 0 ? likeCount : ''}
                            </button>
                            <button class="moment-action-btn" onclick="openMomentDetail('${moment.id}')">
                                <i class="fa fa-comment-o"></i> ${moment.comments ? moment.comments.length : 0}
                            </button>
                        </div>
                    </div>
                    ${interactionsHtml}
                </div>
            </div>
        </div>`;
    }

    DOM.momentsListContainer.innerHTML = html;

    // 异步加载 IndexedDB 图片
    loadIdbImages(DOM.momentsListContainer);
}

// 异步加载所有 idb:// 引用的图片
async function loadIdbImages(container) {
    const imgs = container.querySelectorAll('img[data-idb-ref]');
    for (const img of imgs) {
        const ref = img.dataset.idbRef;
        // 检查元素是否仍在当前文档中（防止DOM被重渲染后操作已脱离的节点）
        if (!container.contains(img)) continue;
        try {
            const url = await resolveImageUrl(ref);
            if (!container.contains(img)) continue; // 异步返回后再次检查
            if (url) {
                // 先绑定事件，再设置 src，确保加载成功/失败都能正确处理
                img.onload = () => {
                    img.classList.remove('idb-loading');
                };
                img.onerror = () => {
                    if (img.parentElement) img.parentElement.style.display = 'none';
                };
                img.src = url;
                if (img.parentElement) {
                    img.parentElement.onclick = () => previewMomentImage(url);
                }
            } else {
                if (img.parentElement) img.parentElement.style.display = 'none';
            }
        } catch (e) {
            if (img.parentElement) img.parentElement.style.display = 'none';
        }
    }
}

// ==================== 评论就地展开/折叠 ====================

function toggleInlineComments(momentId) {
    const preview = document.getElementById('commentsPreview_' + momentId);
    const expanded = document.getElementById('commentsExpand_' + momentId);
    const toggle = document.getElementById('commentsToggle_' + momentId);
    if (!preview || !expanded || !toggle) return;

    const moment = appData.moments.find(m => m.id === momentId);
    if (!moment) return;

    if (expanded.style.display === 'none') {
        // 展开：隐藏预览，显示全部
        preview.style.display = 'none';
        expanded.style.display = 'block';
        toggle.textContent = '收起评论';
    } else {
        // 折叠：显示预览，隐藏全部
        preview.style.display = 'block';
        expanded.style.display = 'none';
        toggle.textContent = `查看全部${moment.comments.length}条评论`;
    }
}
// ==================== 点赞 ====================

function toggleMomentLike(momentId) {
    const moment = appData.moments.find(m => m.id === momentId);
    if (!moment) return;
    if (!moment.likes) moment.likes = [];
    const idx = moment.likes.indexOf('__user__');
    if (idx > -1) moment.likes.splice(idx, 1);
    else moment.likes.push('__user__');
    saveMomentsData();
    renderMomentsList();
    if (appData.momentDetailId === momentId) renderMomentDetail(momentId);
}

// ==================== 图片预览 ====================

function previewMomentImage(url) {
    if (DOM.stickerFullViewImg && DOM.stickerFullViewModal) {
        DOM.stickerFullViewImg.src = url;
        DOM.stickerFullViewModal.classList.remove('hidden');
    }
}
// ==================== 动态详情页 ====================

function openMomentDetail(momentId) {
    const moment = appData.moments.find(m => m.id === momentId);
    if (!moment) return;
    appData.momentDetailId = momentId;
    appData.momentReplyTarget = null;
    renderMomentDetail(momentId);
    DOM.momentDetailPage.classList.remove('translate-x-full');
}

function closeMomentDetail() {
    DOM.momentDetailPage.classList.add('translate-x-full');
    appData.momentDetailId = null;
    appData.momentReplyTarget = null;
}

async function renderMomentDetail(momentId) {
    const moment = appData.moments.find(m => m.id === momentId);
    if (!moment || !DOM.momentDetailContent) return;

    const publisher = getMomentPublisherInfo(moment);
    const isLiked = moment.likes && moment.likes.includes('__user__');
    const likeCount = moment.likes ? moment.likes.length : 0;
    const parsedContent = typeof parseMessageStickers === 'function' ? parseMessageStickers(moment.content) : escapeHtml(moment.content);

    let imagesHtml = '';
    if (moment.images && moment.images.length > 0) {
        const validRefs = moment.images.filter(u => u && u.trim());
        if (validRefs.length > 0) {
            const cols = validRefs.length === 1 ? 'cols-1' : (validRefs.length <= 4 ? 'cols-2' : 'cols-3');
            const imgItems = [];
            for (const ref of validRefs) {
                const isIdb = ref.startsWith('idb://');
                if (isIdb) {
    imgItems.push(`<div class="moment-detail-image-item"><img data-idb-ref="${escapeHtml(ref)}" class="idb-loading" loading="lazy"></div>`);
}
 else {
                    imgItems.push(`<div class="moment-detail-image-item" onclick="previewMomentImage('${escapeHtml(ref)}')"><img src="${escapeHtml(ref)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`);
                }
            }
            imagesHtml = `<div class="moment-detail-images ${cols}">${imgItems.join('')}</div>`;
        }
    }

    let commentsHtml = '';
    if (moment.comments && moment.comments.length > 0) {
        commentsHtml = moment.comments.map(c => {
            const author = getCommentAuthorInfo(c, moment.chatId);
            const parsedComment = typeof parseMessageStickers === 'function' ? parseMessageStickers(c.content) : escapeHtml(c.content);
            const canReply = c.role !== 'user';
            const clickHandler = canReply ? `onclick="setReplyTarget('${moment.id}','${c.id}','${escapeHtml(author.name)}','${c.chatId || ''}','${c.npcFriendId || ''}','${escapeHtml(c.authorName || '')}','${escapeHtml(c.authorRelation || '')}','${escapeHtml(c.authorPersonality || '')}')"` : '';
            const nameClass = canReply ? 'moment-comment-name' : 'moment-comment-name no-click';

            let replyTag = '';
            if (c.replyTo) {
                replyTag = `<span class="moment-comment-reply-tag">回复</span><span class="moment-comment-reply-name">${escapeHtml(c.replyToName || '')}</span>：`;
            }

            return `<div class="moment-comment-full">
                <div class="moment-comment-avatar ${author.avatarClass}">${author.avatarHtml}</div>
                <div class="moment-comment-body">
                    <div class="moment-comment-header">
                        <span class="${nameClass}" ${clickHandler}>${escapeHtml(author.name)}</span>
                        <span class="moment-comment-time">${formatMomentTime(c.timestamp)}</span>
                    </div>
                    <div class="moment-comment-content">${replyTag}${parsedComment}</div>
                </div>
            </div>`;
        }).join('');
    } else {
        commentsHtml = '<div class="moment-no-comments">暂无评论，快来说点什么吧</div>';
    }

    // 删除按钮：只有用户自己发的可删
    const deleteBtn = moment.chatId === '__user__'
        ? `<button class="moment-detail-action-btn" onclick="deleteMoment()" style="color:#f43530;"><i class="fa fa-trash-o"></i><span>删除</span></button>`
        : '';

    DOM.momentDetailContent.innerHTML = `
        <div class="moment-detail-card">
            <div class="moment-detail-header">
                <div class="moment-detail-avatar ${publisher.isUser ? 'user-moment-avatar' : ''}">${publisher.avatarHtml}</div>
                <div>
                    <div class="moment-detail-author">${escapeHtml(publisher.name)}</div>
                    <div class="moment-detail-time">${formatMomentTime(moment.timestamp)}</div>
                </div>
            </div>
            <div class="moment-detail-body">
                <div class="moment-detail-content">${parsedContent}</div>
                ${imagesHtml}
            </div>
            <div class="moment-detail-actions">
                <button class="moment-detail-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleMomentLike('${moment.id}')">
                    <i class="fa fa-heart${isLiked ? '' : '-o'}"></i>
                    <span>${likeCount > 0 ? likeCount + ' 赞' : '点赞'}</span>
                </button>
                <button class="moment-detail-action-btn" onclick="DOM.momentCommentInput.focus()">
                    <i class="fa fa-comment-o"></i>
                    <span>${moment.comments ? moment.comments.length + ' 评论' : '评论'}</span>
                </button>
                ${deleteBtn}
            </div>
        </div>
        <div class="moment-comments-section">
            <div class="moment-comments-title">评论</div>
            ${commentsHtml}
            <div id="momentAiReplyingIndicator" class="moment-ai-replying" style="display:none;">
                <i class="fa fa-spinner"></i> <span>好友们正在回复...</span>
            </div>
        </div>`;

    // 回复指示器
    updateReplyIndicator();

    // 异步加载idb图片
    loadIdbImages(DOM.momentDetailContent);
}

// ==================== 回复指定评论者 ====================

function setReplyTarget(momentId, commentId, authorName, chatId, npcFriendId, tempName, tempRelation, tempPersonality) {
    appData.momentReplyTarget = {
        momentId, commentId, authorName,
        chatId: chatId || null,
        npcFriendId: npcFriendId || null,
        tempName: tempName || '',
        tempRelation: tempRelation || '',
        tempPersonality: tempPersonality || ''
    };
    updateReplyIndicator();
    if (DOM.momentCommentInput) {
        DOM.momentCommentInput.placeholder = `回复 ${authorName}...`;
        DOM.momentCommentInput.focus();
    }
}

function clearReplyTarget() {
    appData.momentReplyTarget = null;
    updateReplyIndicator();
    if (DOM.momentCommentInput) {
        DOM.momentCommentInput.placeholder = '写评论...';
    }
}

function updateReplyIndicator() {
    const container = document.getElementById('momentReplyIndicator');
    if (!container) return;
    if (appData.momentReplyTarget) {
        container.innerHTML = `<div class="moment-reply-indicator">
            <span>回复 <b>${escapeHtml(appData.momentReplyTarget.authorName)}</b></span>
            <button onclick="clearReplyTarget()"><i class="fa fa-times"></i></button>
        </div>`;
        container.style.display = 'block';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

// ==================== 删除动态 ====================

function deleteMoment() {
    if (!appData.momentDetailId) return;
    if (!confirm('确定要删除这条朋友圈动态吗？')) return;

    const moment = appData.moments.find(m => m.id === appData.momentDetailId);
    // 清理IndexedDB中的图片
    if (moment && moment.images) {
        for (const ref of moment.images) {
            if (ref && ref.startsWith('idb://')) {
                deleteImageFromDB(ref.substring(6)).catch(() => {});
            }
        }
    }

    appData.moments = appData.moments.filter(m => m.id !== appData.momentDetailId);
    saveMomentsData();
    closeMomentDetail();
    renderMomentsList();
}

// ==================== 评论功能 ====================

async function sendMomentComment() {
    const content = DOM.momentCommentInput.value.trim();
    if (!content || !appData.momentDetailId) return;

    const moment = appData.moments.find(m => m.id === appData.momentDetailId);
    if (!moment) return;
    if (!moment.comments) moment.comments = [];

    const replyTarget = appData.momentReplyTarget;

    const userComment = {
        id: generateUniqueId(),
        role: 'user',
        content: content,
        timestamp: Date.now()
    };

    // 如果是回复某人
    if (replyTarget) {
        userComment.replyTo = replyTarget.commentId;
        userComment.replyToName = replyTarget.authorName;
    }

    moment.comments.push(userComment);
    saveMomentsData();
    DOM.momentCommentInput.value = '';

    const wasReplyTarget = replyTarget ? { ...replyTarget } : null;
    clearReplyTarget();

    renderMomentDetail(moment.id);
    renderMomentsList();

    // 生成回复
    if (wasReplyTarget) {
        // 回复特定评论者
        await generateReplyFromTarget(moment, content, wasReplyTarget);
    } else if (moment.chatId !== '__user__') {
        // 角色朋友圈下用户直接评论 → 角色回复
        await generateMomentCommentReply(moment, content);
    } else {
        // 用户自己发的朋友圈下评论，不触发额外回复
    }
}

// 角色发的朋友圈 → 角色回复用户评论
async function generateMomentCommentReply(moment, userComment) {
    const chat = appData.chatObjects.find(c => c.id === moment.chatId);
    if (!chat || !appData.apiConfig.apiKey) return;

    showAiReplyingIndicator('正在回复...');

    try {
        const userName = appData.userInfo.name || '用户';
        const systemPrompt = `${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}\n\n你之前发了一条朋友圈动态：\n"${moment.content}"\n\n现在${userName}在你的动态下评论了，请你用简短自然的口吻回复（不超过50字），像真人朋友圈互动一样。不要用引号包裹。`;

        const recentComments = (moment.comments || []).slice(-6).map(c => ({
            role: c.role === 'user' ? 'user' : 'assistant',
            content: c.content
        }));

        const data = await fetchWithRetry(`${appData.apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` },
            body: JSON.stringify({ model: appData.apiConfig.modelName, messages: [{ role: 'system', content: systemPrompt }, ...recentComments], temperature: appData.apiConfig.temperature })
        });

        const aiReply = cleanAiResponse(data.choices[0].message.content);
        if (aiReply) {
            moment.comments.push({
                id: generateUniqueId(),
                role: 'assistant',
                chatId: chat.id,
                content: aiReply,
                timestamp: Date.now(),
                replyTo: moment.comments[moment.comments.length - 1]?.id,
                replyToName: userName
            });
            saveMomentsData();
        }
    } catch (e) {
        logToUI(`朋友圈AI回复失败: ${e.message}`);
    } finally {
        hideAiReplyingIndicator();
        if (appData.momentDetailId === moment.id) renderMomentDetail(moment.id);
        renderMomentsList();
    }
}

// 回复指定评论者 → 该评论者再次回复
async function generateReplyFromTarget(moment, userComment, target) {
    showAiReplyingIndicator(`${target.authorName} 正在回复...`);

    try {
        let systemPrompt = '';
        const userName = appData.userInfo.name || '用户';

        if (target.chatId) {
            // 回复的是一个角色
            const chat = appData.chatObjects.find(c => c.id === target.chatId);
            if (!chat) { hideAiReplyingIndicator(); return; }
            systemPrompt = `${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}\n\n你在一条朋友圈动态下发表了评论。现在${userName}回复了你的评论，请你用简短自然的口吻再次回复（不超过50字），像真人朋友圈互动一样。`;

            const data = await fetchWithRetry(`${appData.apiConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` },
                body: JSON.stringify({
                    model: appData.apiConfig.modelName,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userComment }
                    ],
                    temperature: appData.apiConfig.temperature
                })
            });

            const aiReply = cleanAiResponse(data.choices[0].message.content);
            if (aiReply) {
                moment.comments.push({
                    id: generateUniqueId(), role: 'assistant', chatId: chat.id,
                    content: aiReply, timestamp: Date.now(),
                    replyTo: target.commentId, replyToName: userName
                });
                saveMomentsData();
            }
        } else if (target.npcFriendId) {
            // 回复的是一个手动添加的NPC好友
            const friend = appData.npcFriends.find(f => f.id === target.npcFriendId);
            if (!friend) { hideAiReplyingIndicator(); return; }
            systemPrompt = `你是${friend.name}，性格：${friend.personality || '普通朋友'}。你在一条朋友圈动态下发表了评论。现在${userName}回复了你，请用简短自然的口吻再次回复（不超过30字）。`;

            const reply = await callAuxApi([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userComment }
            ], 0.8);

            const cleaned = cleanAiResponse(reply);
            if (cleaned) {
                moment.comments.push({
                    id: generateUniqueId(), role: 'npc', npcFriendId: friend.id, authorName: friend.name,
                    content: cleaned, timestamp: Date.now(),
                    replyTo: target.commentId, replyToName: userName
                });
                saveMomentsData();
            }
        } else if (target.tempName) {
            // 回复的是临时好友（搜索/虚构的）
            systemPrompt = `你是${target.tempName}，与朋友圈主人的关系是${target.tempRelation || '朋友'}，性格：${target.tempPersonality || '普通'}。${userName}回复了你在朋友圈下的评论，请用简短自然的口吻再次回复（不超过30字）。`;

            const reply = await callAuxApi([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userComment }
            ], 0.8);

            const cleaned = cleanAiResponse(reply);
            if (cleaned) {
                moment.comments.push({
                    id: generateUniqueId(), role: 'npc',
                    authorName: target.tempName, authorRelation: target.tempRelation, authorPersonality: target.tempPersonality,
                    content: cleaned, timestamp: Date.now(),
                    replyTo: target.commentId, replyToName: userName
                });
                saveMomentsData();
            }
        }
    } catch (e) {
        logToUI(`回复评论者失败: ${e.message}`);
    } finally {
        hideAiReplyingIndicator();
        if (appData.momentDetailId === moment.id) renderMomentDetail(moment.id);
        renderMomentsList();
    }
}

function showAiReplyingIndicator(text) {
    const indicator = document.getElementById('momentAiReplyingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        const span = indicator.querySelector('span');
        if (span) span.textContent = text || '正在回复...';
    }
}

function hideAiReplyingIndicator() {
    const indicator = document.getElementById('momentAiReplyingIndicator');
    if (indicator) indicator.style.display = 'none';
}

// ==================== 发布朋友圈后自动生成好友评论 ====================

async function generateFriendComments(moment) {
    if (!appData.apiConfig.apiKey) return;

    const isUserPost = moment.chatId === '__user__';
    const commenters = [];

    if (isUserPost) {
        // 用户发的 → 所有角色 + 随机好友
        for (const chat of appData.chatObjects) {
            commenters.push({ type: 'chat', chat, name: chat.name });
        }
        // 随机选一些手动好友
        const allFriends = [...appData.npcFriends];
        const friendCount = Math.min(allFriends.length, Math.ceil(allFriends.length * 0.6));
        const shuffledFriends = allFriends.sort(() => Math.random() - 0.5).slice(0, friendCount);
        for (const f of shuffledFriends) {
            commenters.push({ type: 'npc', friend: f, name: f.name });
        }
    } else {
        // 角色发的 → 手动好友 + 临时好友 + 随机其他角色
        const chat = appData.chatObjects.find(c => c.id === moment.chatId);
        if (!chat) return;

        // 手动添加的好友
        const manualFriends = getRelatedFriends(chat.id);

        if (manualFriends.length >= 2) {
            // 够了，用手动好友
            for (const f of manualFriends) {
                commenters.push({ type: 'npc', friend: f, name: f.name });
            }
        } else {
            // 不够，搜索/虚构临时好友
            if (manualFriends.length > 0) {
                for (const f of manualFriends) {
                    commenters.push({ type: 'npc', friend: f, name: f.name });
                }
            }
            const tempFriends = await getOrCreateTempFriends(chat);
            for (const tf of tempFriends) {
                commenters.push({ type: 'temp', tempFriend: tf, name: tf.name });
            }
        }

        // 随机加几个其他角色
        const otherChats = appData.chatObjects.filter(c => c.id !== moment.chatId);
        const otherCount = Math.min(otherChats.length, Math.max(1, Math.ceil(otherChats.length * 0.3)));
        const shuffledOther = otherChats.sort(() => Math.random() - 0.5).slice(0, otherCount);
        for (const oc of shuffledOther) {
            commenters.push({ type: 'chat', chat: oc, name: oc.name });
        }
    }

    if (commenters.length === 0) return;

    // 随机选40%-70%来评论
    const total = commenters.length;
    const minCount = Math.max(1, Math.ceil(total * 0.4));
    const maxCount = Math.ceil(total * 0.7);
    const count = Math.min(total, minCount + Math.floor(Math.random() * (maxCount - minCount + 1)));
    const selected = commenters.sort(() => Math.random() - 0.5).slice(0, count);

    // 分批生成：角色单独调，NPC/临时2-3个一批
    const chatCommenters = selected.filter(c => c.type === 'chat');
    const npcCommenters = selected.filter(c => c.type === 'npc' || c.type === 'temp');

    // 逐条生成角色评论
    for (const item of chatCommenters) {
        await generateSingleChatComment(moment, item.chat);
    }

    // 批量生成NPC评论（2-3个一批）
    for (let i = 0; i < npcCommenters.length; i += 3) {
        const batch = npcCommenters.slice(i, i + 3);
        await generateBatchNpcComments(moment, batch);
    }
}

async function generateSingleChatComment(moment, chat) {
    const isDetailOpen = appData.momentDetailId === moment.id;

    if (isDetailOpen) showAiReplyingIndicator(`${chat.name} 正在评论...`);

    try {
        const publisher = getMomentPublisherInfo(moment);
        const systemPrompt = `${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}\n\n${publisher.name}发了一条朋友圈：\n"${moment.content}"\n\n请你用简短自然的口吻评论这条朋友圈（不超过30字），像真人朋友圈互动一样。不要用引号包裹回复。只输出评论内容。`;

        const data = await fetchWithRetry(`${appData.apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` },
            body: JSON.stringify({
                model: appData.apiConfig.modelName,
                messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: '请评论这条朋友圈' }],
                temperature: 0.9
            })
        });

        const reply = cleanAiResponse(data.choices[0].message.content);
        if (reply) {
            if (!moment.comments) moment.comments = [];
            moment.comments.push({
                id: generateUniqueId(), role: 'assistant', chatId: chat.id,
                content: reply, timestamp: Date.now()
            });
            saveMomentsData();

            if (!isMomentsPageVisible()) setMomentsUnread(true);
            if (isDetailOpen) renderMomentDetail(moment.id);
        }
    } catch (e) {
        logToUI(`[${chat.name}] 评论生成失败: ${e.message}`);
    } finally {
        if (isDetailOpen) hideAiReplyingIndicator();
    }
}

async function generateBatchNpcComments(moment, batch) {
    if (batch.length === 0) return;

    const isDetailOpen = appData.momentDetailId === moment.id;
    const names = batch.map(b => b.name).join('、');
    if (isDetailOpen) showAiReplyingIndicator(`${names} 正在评论...`);

    try {
        const publisher = getMomentPublisherInfo(moment);
        const friendDescs = batch.map((b, i) => {
            if (b.type === 'npc' && b.friend) {
                return `${i + 1}. ${b.friend.name}（关系：${b.friend.relationship || '朋友'}，性格：${b.friend.personality || '普通'}）`;
            } else if (b.type === 'temp' && b.tempFriend) {
                return `${i + 1}. ${b.tempFriend.name}（关系：${b.tempFriend.relationship || '朋友'}，性格：${b.tempFriend.personality || '普通'}）`;
            }
            return `${i + 1}. ${b.name}`;
        }).join('\n');

        const prompt = `${publisher.name}发了一条朋友圈：
"${moment.content}"

以下好友要分别评论这条朋友圈，请为每人写一条简短自然的评论（每条不超过30字），像真人朋友圈互动。

好友列表：
${friendDescs}

请严格按以下格式输出（每行一条）：
名字|评论内容`;

        const reply = await callAuxApi([{ role: 'user', content: prompt }], 0.9);
        const cleaned = cleanAiResponse(reply);
        const lines = cleaned.split('\n').filter(l => l.includes('|'));

        if (!moment.comments) moment.comments = [];

        for (const line of lines) {
            const parts = line.split('|').map(s => s.trim());
            if (parts.length < 2 || !parts[1]) continue;
            const commentName = parts[0].replace(/^\d+[\.\、\)]\s*/, '');
            const commentContent = parts[1];

            // 匹配到对应的commenter
            const matched = batch.find(b => b.name === commentName || commentName.includes(b.name) || b.name.includes(commentName));

            const comment = {
                id: generateUniqueId(),
                role: 'npc',
                content: commentContent,
                timestamp: Date.now() + Math.random() * 60000 // 随机错开时间
            };

            if (matched) {
                if (matched.type === 'npc' && matched.friend) {
                    comment.npcFriendId = matched.friend.id;
                    comment.authorName = matched.friend.name;
                } else if (matched.type === 'temp' && matched.tempFriend) {
                    comment.authorName = matched.tempFriend.name;
                    comment.authorRelation = matched.tempFriend.relationship;
                    comment.authorPersonality = matched.tempFriend.personality;
                }
            } else {
                comment.authorName = commentName;
            }

            moment.comments.push(comment);
        }

        saveMomentsData();
        if (!isMomentsPageVisible()) setMomentsUnread(true);
        if (isDetailOpen) renderMomentDetail(moment.id);
    } catch (e) {
        logToUI(`批量NPC评论生成失败: ${e.message}`);
    } finally {
        if (isDetailOpen) hideAiReplyingIndicator();
    }
}
// ==================== 切换发布模式 ====================

function switchPublishMode(mode) {
    appData.momentsTempData.mode = mode;
    const autoBtn = DOM.publishModeAuto;
    const manualBtn = DOM.publishModeManual;
    const autoOpts = DOM.publishAutoOptions;
    const manualOpts = DOM.publishManualOptions;

    if (mode === 'auto') {
        if (autoOpts) autoOpts.classList.remove('hidden');
        if (manualOpts) manualOpts.classList.add('hidden');
        if (autoBtn) {
            autoBtn.className = 'flex-1 py-2 px-3 rounded-lg border-2 border-wechat-green bg-wechat-green/10 text-wechat-green text-sm font-medium transition-all active';
        }
        if (manualBtn) {
            manualBtn.className = 'flex-1 py-2 px-3 rounded-lg border-2 border-wechat-darkGray text-wechat-lightText text-sm font-medium transition-all';
        }
    } else {
        if (autoOpts) autoOpts.classList.add('hidden');
        if (manualOpts) manualOpts.classList.remove('hidden');
        if (manualBtn) {
            manualBtn.className = 'flex-1 py-2 px-3 rounded-lg border-2 border-wechat-green bg-wechat-green/10 text-wechat-green text-sm font-medium transition-all active';
        }
        if (autoBtn) {
            autoBtn.className = 'flex-1 py-2 px-3 rounded-lg border-2 border-wechat-darkGray text-wechat-lightText text-sm font-medium transition-all';
        }
    }
}

// ==================== 发布朋友圈 ====================

function openPublishMomentModal() {
    const chatId = DOM.momentsChatSelector ? DOM.momentsChatSelector.value : '';
    if (!chatId) {
        alert('请先选择一个角色或"我"');
        return;
    }
    appData.momentsTempData.chatId = chatId;

    if (chatId === '__user__') {
        // 用户发布：只能手动
        appData.momentsTempData.mode = 'manual';
        if (DOM.publishModeAuto) DOM.publishModeAuto.classList.remove('active');
        if (DOM.publishModeManual) DOM.publishModeManual.classList.add('active');
        if (DOM.publishModeAuto) DOM.publishModeAuto.disabled = true;
    } else {
        appData.momentsTempData.mode = 'auto';
        if (DOM.publishModeAuto) { DOM.publishModeAuto.classList.add('active'); DOM.publishModeAuto.disabled = false; }
        if (DOM.publishModeManual) DOM.publishModeManual.classList.remove('active');
    }

    // 图片模式默认
    setImageMode(appData.momentsTempData.imageMode || 'ai');

    if (DOM.publishMomentContent) DOM.publishMomentContent.value = '';
    if (DOM.publishMomentImages) DOM.publishMomentImages.value = '';
    DOM.publishMomentModal.classList.remove('hidden');
}

function closePublishMomentModal() {
    DOM.publishMomentModal.classList.add('hidden');
}

function setImageMode(mode) {
    appData.momentsTempData.imageMode = mode;
    const btnAi = document.getElementById('publishImageModeAI');
    const btnUrl = document.getElementById('publishImageModeUrl');
    const btnNone = document.getElementById('publishImageModeNone');
    const areaUrl = document.getElementById('publishImageUrlArea');
    const areaAi = document.getElementById('publishImageAIArea');

    [btnAi, btnUrl, btnNone].forEach(b => { if (b) b.classList.remove('active'); });

    if (mode === 'ai') {
        if (btnAi) btnAi.classList.add('active');
        if (areaUrl) areaUrl.classList.add('hidden');
        if (areaAi) areaAi.classList.remove('hidden');
    } else if (mode === 'url') {
        if (btnUrl) btnUrl.classList.add('active');
        if (areaUrl) areaUrl.classList.remove('hidden');
        if (areaAi) areaAi.classList.add('hidden');
    } else {
        if (btnNone) btnNone.classList.add('active');
        if (areaUrl) areaUrl.classList.add('hidden');
        if (areaAi) areaAi.classList.add('hidden');
    }
}

async function confirmPublishMoment() {
    const chatId = appData.momentsTempData.chatId;
    if (!chatId) return;

    const mode = appData.momentsTempData.mode;
    const imageMode = appData.momentsTempData.imageMode;

    // 手动模式先验证内容
    let manualContent = '';
    if (mode === 'manual') {
        manualContent = DOM.publishMomentContent ? DOM.publishMomentContent.value.trim() : '';
        if (!manualContent) { alert('请输入朋友圈内容'); return; }
    } else {
        // AI模式验证
        const chat = appData.chatObjects.find(c => c.id === chatId);
        if (!chat) { alert('找不到该角色'); return; }
        if (!appData.apiConfig.apiKey) { alert('请先配置API'); return; }
    }

    // 收集手动URL（如果有的话）
    let manualImageUrls = [];
    if (imageMode === 'url') {
        const urlText = DOM.publishMomentImages ? DOM.publishMomentImages.value.trim() : '';
        if (urlText) {
            manualImageUrls = urlText.split('\n').map(u => u.trim()).filter(u => u).slice(0, 9);
        }
    }

    // 立即关闭模态框
    closePublishMomentModal();

    // 获取发布者信息用于显示进度
    const chat = appData.chatObjects.find(c => c.id === chatId);
    const publisherName = chatId === '__user__' ? (appData.userInfo.name || '我') : (chat ? chat.name : '未知');
    const publisherAvatarHtml = chatId === '__user__' ? getUserAvatarHtml() : getChatAvatarHtml(chat);

    // 显示进度指示器
    showPublishingIndicator(publisherName, publisherAvatarHtml);

    // 后台执行发布
    try {
        let content = '';
        let images = [];

        // 1. 生成文案
        if (mode === 'manual') {
            content = manualContent;
        } else {
            updatePublishingIndicator('正在生成文案...');
            const prompt = `${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}\n\n请你以这个角色的身份，写一条朋友圈动态。要求：\n1. 符合角色性格和说话风格\n2. 内容自然真实，像真人发朋友圈\n3. 可以分享日常、心情、见闻等\n4. 不超过200字\n5. 只输出朋友圈文案，不要其他内容`;

            const data = await fetchWithRetry(`${appData.apiConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` },
                body: JSON.stringify({
                    model: appData.apiConfig.modelName,
                    messages: [{ role: 'system', content: prompt }, { role: 'user', content: '请发一条朋友圈' }],
                    temperature: 0.9
                })
            });

            content = cleanAiResponse(data.choices[0].message.content);
            if (!content) {
                hidePublishingIndicator();
                logToUI('朋友圈AI生成文案失败');
                return;
            }
        }

        // 2. 处理图片
        if (imageMode === 'url') {
            images = manualImageUrls;
        } else if (imageMode === 'ai') {
            const imgCfg = getImageGenApiConfig();
            if (imgCfg.modelName) {
                if (Math.random() < 0.7) {
                    updatePublishingIndicator('正在生成配图...');
                    const imgPrompt = `为以下朋友圈内容生成一张配图，要求画面美观、符合内容氛围：\n\n"${content.substring(0, 200)}"`;
                    const imgData = await generateImageByAI(imgPrompt);
                    if (imgData) {
                        const imgRef = await saveGeneratedImage(imgData);
                        images = [imgRef];
                    }
                }
            }
        }

        // 3. 创建朋友圈
        const moment = {
            id: generateUniqueId(),
            chatId: chatId,
            content: content,
            images: images,
            likes: [],
            comments: [],
            timestamp: Date.now()
        };

        appData.moments.push(moment);
        saveMomentsData();

        logToUI(`朋友圈发布成功: ${content.substring(0, 30)}...`);

        // 隐藏进度，刷新列表
        hidePublishingIndicator();
        if (isMomentsPageVisible()) {
            renderMomentsList();
        } else {
            setMomentsUnread(true);
        }

        // 4. 后台生成好友评论
        generateFriendComments(moment).then(() => {
            if (isMomentsPageVisible()) {
                renderMomentsList();
            } else {
                setMomentsUnread(true);
            }
        }).catch(e => {
            logToUI(`好友评论生成失败: ${e.message}`);
        });

    } catch (e) {
        hidePublishingIndicator();
        logToUI(`朋友圈发布失败: ${e.message}`);
        // 不弹alert了，因为用户可能已经在别的页面
        setMomentsUnread(true); // 通知用户去看看
    }
}

// ==================== 发布进度指示器 ====================

function showPublishingIndicator(name, avatarHtml) {
    const el = document.getElementById('momentsPublishingIndicator');
    if (!el) return;
    el.innerHTML = `
        <div class="moment-publishing-bar">
            <div class="moment-publishing-avatar">${avatarHtml}</div>
            <div class="moment-publishing-info">
                <div class="moment-publishing-name">${escapeHtml(name)}</div>
                <div class="moment-publishing-status" id="publishingStatusText">
                    <i class="fa fa-spinner fa-spin"></i> 朋友圈生成中...
                </div>
            </div>
        </div>`;
    el.classList.remove('hidden');
}

function updatePublishingIndicator(text) {
    const el = document.getElementById('publishingStatusText');
    if (el) el.innerHTML = `<i class="fa fa-spinner fa-spin"></i> ${escapeHtml(text)}`;
}

function hidePublishingIndicator() {
    const el = document.getElementById('momentsPublishingIndicator');
    if (el) {
        el.classList.add('hidden');
        el.innerHTML = '';
    }
}

// ==================== NPC好友管理 ====================

function openNpcFriendsModal() {
    renderNpcFriendsList();
    refreshNpcFriendBindSelector();
    DOM.npcFriendsModal.classList.remove('hidden');
}

function closeNpcFriendsModal() {
    // 退出编辑状态
    if (appData.npcFriendTempData && appData.npcFriendTempData.editingId) {
        appData.npcFriendTempData.editingId = null;
        updateNpcFriendFormUI(false);
    }
    // 清空表单
    const nameEl = document.getElementById('npcFriendName');
    const relEl = document.getElementById('npcFriendRelation');
    const persEl = document.getElementById('npcFriendPersonality');
    const bindEl = document.getElementById('npcFriendBindChat');
    if (nameEl) nameEl.value = '';
    if (relEl) relEl.value = '';
    if (persEl) persEl.value = '';
    if (bindEl) bindEl.value = '';

    DOM.npcFriendsModal.classList.add('hidden');
}


function renderNpcFriendsList() {
    const container = document.getElementById('npcFriendsListContainer');
    if (!container) return;

    if (appData.npcFriends.length === 0) {
        container.innerHTML = '<div class="npc-friends-empty"><i class="fa fa-user-plus"></i><br>还没有添加好友<br>添加好友后，他们会在朋友圈下留言互动</div>';
        return;
    }

    const editingId = appData.npcFriendTempData ? appData.npcFriendTempData.editingId : null;

    container.innerHTML = appData.npcFriends.map(f => {
        const bindChat = f.bindChatId ? appData.chatObjects.find(c => c.id === f.bindChatId) : null;
        const bindText = bindChat ? `绑定: ${bindChat.name}` : '共享好友';
        const isEditing = editingId === f.id;
        return `<div class="npc-friend-item" style="${isEditing ? 'border:2px solid #07C160;border-radius:8px;' : ''}">
            <div class="npc-friend-avatar"><i class="fa fa-user"></i></div>
            <div class="npc-friend-info" onclick="editNpcFriend('${f.id}')" style="cursor:pointer;" title="点击编辑">
                <div class="npc-friend-name">${escapeHtml(f.name)}</div>
                <div class="npc-friend-meta">${escapeHtml(f.relationship || '')} · ${escapeHtml(f.personality || '')} · ${escapeHtml(bindText)}</div>
            </div>
            <button class="npc-friend-delete" onclick="event.stopPropagation();editNpcFriend('${f.id}')" title="编辑" style="color:#07C160;background:rgba(7,193,96,0.1);border:none;padding:4px 8px;border-radius:50%;cursor:pointer;margin-right:4px;"><i class="fa fa-pencil"></i></button>
            <button class="npc-friend-delete" onclick="event.stopPropagation();deleteNpcFriend('${f.id}')" title="删除"><i class="fa fa-trash"></i></button>
        </div>`;
    }).join('');
}


function refreshNpcFriendBindSelector() {
    const sel = document.getElementById('npcFriendBindChat');
    if (!sel) return;
    sel.innerHTML = '<option value="">不绑定（所有人共享）</option>';
    appData.chatObjects.forEach(chat => {
        const opt = document.createElement('option');
        opt.value = chat.id;
        opt.textContent = chat.name;
        sel.appendChild(opt);
    });
}

function addNpcFriend() {
    const nameEl = document.getElementById('npcFriendName');
    const relEl = document.getElementById('npcFriendRelation');
    const persEl = document.getElementById('npcFriendPersonality');
    const bindEl = document.getElementById('npcFriendBindChat');

    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) { alert('请输入好友名称'); return; }

    const editingId = appData.npcFriendTempData ? appData.npcFriendTempData.editingId : null;

    if (editingId) {
        // ===== 编辑模式：更新已有好友 =====
        const friend = appData.npcFriends.find(f => f.id === editingId);
        if (!friend) { cancelEditNpcFriend(); return; }

        friend.name = name;
        friend.relationship = relEl ? relEl.value.trim() : '';
        friend.personality = persEl ? persEl.value.trim() : '';
        friend.bindChatId = bindEl ? bindEl.value : '';

        saveNpcFriendsData();
        logToUI(`编辑NPC好友: ${name}`);
        cancelEditNpcFriend();
    } else {
        // ===== 添加模式：新建好友 =====
        const friend = {
            id: 'npc_' + generateUniqueId(),
            name: name,
            relationship: relEl ? relEl.value.trim() : '',
            personality: persEl ? persEl.value.trim() : '',
            bindChatId: bindEl ? bindEl.value : ''
        };

        appData.npcFriends.push(friend);
        saveNpcFriendsData();

        // 清空表单
        if (nameEl) nameEl.value = '';
        if (relEl) relEl.value = '';
        if (persEl) persEl.value = '';
        if (bindEl) bindEl.value = '';

        renderNpcFriendsList();
        logToUI(`添加NPC好友: ${name}`);
    }
}


function deleteNpcFriend(id) {
    if (!confirm('确定删除这个好友吗？')) return;
    appData.npcFriends = appData.npcFriends.filter(f => f.id !== id);
    saveNpcFriendsData();
    renderNpcFriendsList();
}
function editNpcFriend(id) {
    const friend = appData.npcFriends.find(f => f.id === id);
    if (!friend) return;

    if (!appData.npcFriendTempData) appData.npcFriendTempData = {};
    appData.npcFriendTempData.editingId = id;

    // 填充表单
    const nameEl = document.getElementById('npcFriendName');
    const relEl = document.getElementById('npcFriendRelation');
    const persEl = document.getElementById('npcFriendPersonality');
    const bindEl = document.getElementById('npcFriendBindChat');

    if (nameEl) nameEl.value = friend.name || '';
    if (relEl) relEl.value = friend.relationship || '';
    if (persEl) persEl.value = friend.personality || '';
    if (bindEl) bindEl.value = friend.bindChatId || '';

    updateNpcFriendFormUI(true);
    renderNpcFriendsList();

    if (nameEl) {
        nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nameEl.focus(), 300);
    }
}

function cancelEditNpcFriend() {
    if (!appData.npcFriendTempData) appData.npcFriendTempData = {};
    appData.npcFriendTempData.editingId = null;

    const nameEl = document.getElementById('npcFriendName');
    const relEl = document.getElementById('npcFriendRelation');
    const persEl = document.getElementById('npcFriendPersonality');
    const bindEl = document.getElementById('npcFriendBindChat');

    if (nameEl) nameEl.value = '';
    if (relEl) relEl.value = '';
    if (persEl) persEl.value = '';
    if (bindEl) bindEl.value = '';

    updateNpcFriendFormUI(false);
    renderNpcFriendsList();
}

function updateNpcFriendFormUI(isEditing) {
    const titleEl = document.getElementById('npcFriendFormTitle');
    const addBtn = document.getElementById('npcFriendAddBtn');
    const cancelBtn = document.getElementById('npcFriendCancelEditBtn');
    const aiBtn = document.getElementById('npcFriendAiBtn');

    if (isEditing) {
        if (titleEl) titleEl.textContent = '✏️ 编辑好友';
        if (addBtn) addBtn.innerHTML = '<i class="fa fa-check mr-1"></i> <span>保存修改</span>';
        if (cancelBtn) cancelBtn.style.display = '';
        if (aiBtn) aiBtn.style.display = 'none';
    } else {
        if (titleEl) titleEl.textContent = '手动添加好友';
        if (addBtn) addBtn.innerHTML = '<i class="fa fa-plus mr-1"></i> <span>添加</span>';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (aiBtn) aiBtn.style.display = '';
    }
}

// ==================== AI推荐好友 ====================

function openAiSuggestModal() {
    const sel = document.getElementById('aiSuggestTargetChat');
    if (sel) {
        sel.innerHTML = '<option value="">选择角色</option>';
        appData.chatObjects.forEach(chat => {
            const opt = document.createElement('option');
            opt.value = chat.id;
            opt.textContent = chat.name;
            sel.appendChild(opt);
        });
    }
    const results = document.getElementById('aiSuggestResults');
    if (results) results.innerHTML = '';
    DOM.aiSuggestFriendsModal.classList.remove('hidden');
}

function closeAiSuggestModal() {
    DOM.aiSuggestFriendsModal.classList.add('hidden');
}

async function startAiSuggest() {
    const sel = document.getElementById('aiSuggestTargetChat');
    const chatId = sel ? sel.value : '';
    if (!chatId) { alert('请选择一个角色'); return; }

    const chat = appData.chatObjects.find(c => c.id === chatId);
    if (!chat) return;

    const results = document.getElementById('aiSuggestResults');
    const btn = document.getElementById('startAiSuggestBtn');
    if (btn) { btn.disabled = true; btn.textContent = '正在搜索...'; }
    if (results) results.innerHTML = '<div class="text-center text-wechat-lightText py-4"><i class="fa fa-spinner fa-spin"></i> 正在分析角色关系...</div>';

    try {
        const prompt = `以下是一个角色的人物设定描述：

"""
${chat.systemPrompt.substring(0, 2000)}
"""

请根据这个角色的身份背景，分析TA可能来自哪部作品（如果是已知IP的话），并推荐3-5个适合作为TA好友的角色。

可以是：
1. 原作中的朋友/同伴/关系密切的角色（如果能判断来源）
2. 如果无法判断来源，请虚构符合该角色背景的合理好友

请严格按以下格式输出（每行一个）：
名字|与该角色的关系|性格特点`;

        const reply = await callAuxApi([{ role: 'user', content: prompt }], 0.7);
        const cleaned = cleanAiResponse(reply);
        const friends = parseListedFriends(cleaned);

        if (friends.length === 0) {
            if (results) results.innerHTML = '<div class="text-center text-wechat-lightText py-4">未能生成好友推荐，请重试</div>';
            return;
        }

        if (results) {
            results.innerHTML = friends.map((f, i) => `
                <div class="npc-friend-item">
                    <div class="npc-friend-avatar"><i class="fa fa-user"></i></div>
                    <div class="npc-friend-info">
                        <div class="npc-friend-name">${escapeHtml(f.name)}</div>
                        <div class="npc-friend-meta">${escapeHtml(f.relationship)} · ${escapeHtml(f.personality)}</div>
                    </div>
                    <button class="bg-wechat-green text-white px-3 py-1 rounded-lg text-xs" onclick="adoptSuggestedFriend(${i},'${chatId}')">
                        <i class="fa fa-plus"></i> 添加
                    </button>
                </div>
            `).join('');

            // 临时存储推荐结果
            appData.npcFriendTempData.suggestions = friends;
        }
    } catch (e) {
        if (results) results.innerHTML = `<div class="text-center text-red-500 py-4">推荐失败: ${escapeHtml(e.message)}</div>`;
        logToUI(`AI推荐好友失败: ${e.message}`);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '开始推荐'; }
    }
}

function adoptSuggestedFriend(index, chatId) {
    const suggestions = appData.npcFriendTempData.suggestions;
    if (!suggestions || !suggestions[index]) return;

    const f = suggestions[index];
    const friend = {
        id: 'npc_' + generateUniqueId(),
        name: f.name,
        relationship: f.relationship,
        personality: f.personality,
        bindChatId: chatId
    };

    appData.npcFriends.push(friend);
    saveNpcFriendsData();

    // 标记已添加
    const btn = event.target.closest('button');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-check"></i> 已添加';
        btn.classList.remove('bg-wechat-green');
        btn.classList.add('bg-gray-400');
    }

    logToUI(`从AI推荐添加好友: ${f.name}`);
}