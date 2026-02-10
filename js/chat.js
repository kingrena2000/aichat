/* =========================================================================
   微信风格多AI聊天 - 聊天功能模块 (chat.js)
   ========================================================================= */

// 渲染聊天列表
function renderChatList() {
    DOM.chatListContainer.innerHTML = '';
    if (appData.chatObjects.length === 0) {
        DOM.emptyChatList.classList.remove('hidden');
        return;
    }
    DOM.emptyChatList.classList.add('hidden');
    
    // 按最后一条消息时间或创建时间倒序排列
    [...appData.chatObjects].sort((a, b) => (b.messages.slice(-1)[0]?.timestamp || b.createdAt) - (a.messages.slice(-1)[0]?.timestamp || a.createdAt)).forEach(c => {
        const iC = document.createElement('div');
        iC.className = 'chat-item-container relative';
        const w = document.createElement('div');
        w.className = 'chat-item-wrapper';
        const i = document.createElement('div');
        i.className = 'flex items-center flex-1 p-4 border-b border-wechat-darkGray cursor-pointer';
        i.dataset.chatId = c.id;
        const l = c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '暂无消息';
        
        i.innerHTML = `<div class="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
            ${c.avatar && c.avatar.type !== 'default' && c.avatar.url ? 
            `<img src="${escapeHtml(c.avatar.url)}" alt="${escapeHtml(c.name)}" class="w-full h-full object-cover">` : 
            `<div class="w-full h-full bg-wechat-green flex items-center justify-center text-white"><i class="fa fa-robot"></i></div>`}
        </div>
        <div class="flex-1 min-w-0">
            <h3 class="font-medium text-wechat-text truncate">${escapeHtml(c.name)}</h3>
            <p class="text-xs text-wechat-lightText truncate mt-1">${escapeHtml(l.substring(0, 20) + (l.length > 20 ? '...' : ''))}</p>
        </div>`;
        
        const aD = document.createElement('div');
        aD.className = 'chat-item-actions';
        aD.innerHTML = `<button class="edit-action-btn" title="编辑" data-chat-id="${c.id}"><i class="fa fa-pencil"></i></button>
        <button class="delete-action-btn" title="删除" data-chat-id="${c.id}"><i class="fa fa-trash"></i></button>`;
        
        const dB = document.createElement('div');
        dB.className = 'slide-delete-btn';
        dB.innerHTML = '<i class="fa fa-trash mr-1"></i>移除';
        
        w.append(i, dB);
        iC.append(w, aD);
        DOM.chatListContainer.appendChild(iC);
        
        setupSwipeToDelete(w, c.id);
        i.addEventListener('click', () => openChat(c.id));
        aD.querySelector('.edit-action-btn').addEventListener('click', (e) => { e.stopPropagation(); openChatDetail(c.id); });
        aD.querySelector('.delete-action-btn').addEventListener('click', (e) => { e.stopPropagation(); showConfirmDeleteModal(c.id); });
    });
}

// 删除聊天对象
function deleteChat(chatId) {
    appData.chatObjects = appData.chatObjects.filter(chat => chat.id !== chatId);
    if (appData.activeChatId === chatId) {
        appData.activeChatId = null;
        localStorage.removeItem('aiMultiChatActiveId');
        DOM.chatPage.classList.add('hidden');
        DOM.chatListPage.classList.remove('hidden');
    }
    hideConfirmDeleteModal();
    saveDataToStorage();
    renderChatList();
    if (typeof renderDiaryList === 'function' && isDiaryPageVisible()) renderDiaryList();
}

// 创建新聊天
function createNewChat() {
    const nC = {
        id: generateUniqueId(),
        name: DOM.newChatName.value.trim() || 'AI助手',
        avatar: { ...appData.newChatTempData.avatar },
        systemPrompt: DOM.newChatSystemPrompt.value.trim() || '你是一个友好、helpful 的AI助手。',
        messages: [],
        diaries: [],
        lastDiaryIndex: 0,
        createdAt: Date.now()
    };
    appData.chatObjects.push(nC);
    saveDataToStorage();
    closeAddChatModal(); // Defined in app.js
    renderChatList();
    if (typeof renderDiaryList === 'function' && isDiaryPageVisible()) renderDiaryList();
    openChat(nC.id);
}

// 保存聊天详情修改
function saveChatDetail() {
    const chatIndex = appData.chatObjects.findIndex(c => c.id === appData.editChatTempData.chatId);
    if (chatIndex === -1) return;
    const updatedChat = {
        ...appData.chatObjects[chatIndex],
        name: DOM.editChatName.value.trim() || 'AI助手',
        systemPrompt: DOM.editChatSystemPrompt.value.trim() || '你是一个友好、helpful 的AI助手。',
        avatar: { ...appData.editChatTempData.avatar }
    };
    appData.chatObjects[chatIndex] = updatedChat;
    saveDataToStorage();
    renderChatList();
    if (typeof renderDiaryList === 'function' && isDiaryPageVisible()) renderDiaryList();
    if (appData.activeChatId === updatedChat.id) openChat(updatedChat.id);
    DOM.chatDetailPage.classList.add('translate-x-full');
}

// 打开聊天界面
function openChat(id) {
    const c = appData.chatObjects.find(c => c.id === id);
    if (!c) return;
    appData.activeChatId = id;
    saveDataToStorage();
    DOM.chatPageTitle.textContent = c.name;
    DOM.chatPageAvatar.innerHTML = c.avatar && c.avatar.type !== 'default' && c.avatar.url ? 
        `<img src="${escapeHtml(c.avatar.url)}" alt="${escapeHtml(c.name)}" class="w-full h-full object-cover">` : 
        `<div class="w-full h-full rounded-full bg-wechat-green flex items-center justify-center text-white"><i class="fa fa-robot"></i></div>`;
    DOM.chatPageTypingText.textContent = `${c.name}正在输入中...`;
    renderChatMessages(c.messages);
    DOM.chatListPage.classList.add('hidden');
    DOM.chatPage.classList.remove('hidden');
    DOM.chatPageMessageInput.value = '';
    DOM.chatPageMessageInput.style.height = 'auto';
    setTimeout(() => {
        if (DOM.chatPageContainer) DOM.chatPageContainer.scrollTop = DOM.chatPageContainer.scrollHeight;
        if (typeof adjustHeights === 'function') adjustHeights();
    }, 100);
}

// 打开聊天详情页
function openChatDetail(id) {
    const c = appData.chatObjects.find(c => c.id === id);
    if (!c) return;
    appData.editChatTempData = { chatId: id, avatar: { ...c.avatar } };
    DOM.editChatName.value = c.name;
    DOM.editChatSystemPrompt.value = c.systemPrompt;
    updateEditChatAvatarPreview(); // Defined in app.js
    DOM.editAvatarContainer.classList.add('hidden');
    DOM.chatDetailPage.classList.remove('translate-x-full');
}

// 渲染聊天消息
function renderChatMessages(m) {
    DOM.chatPageContainer.innerHTML = m.length === 0 ? 
        `<div class="flex flex-col items-center justify-center h-full text-wechat-lightText py-10"><i class="fa fa-comments-o text-4xl mb-3 opacity-50"></i><p class="text-sm">发送第一条消息开始对话吧</p></div>` : '';
    if (m.length === 0) return;
    
    m.forEach((g, x) => {
        const e = document.createElement('div');
        e.className = `flex items-start mb-6 ${g.role === 'user' ? 'justify-end' : ''}`;
        e.dataset.messageRole = g.role;
        e.dataset.messageIndex = x;
        
        const uA = appData.userInfo.avatar && appData.userInfo.avatar.type !== 'default' && appData.userInfo.avatar.url ?
            `<div class="w-8 h-8 rounded-full overflow-hidden ml-3 flex-shrink-0"><img src="${escapeHtml(appData.userInfo.avatar.url)}" class="w-full h-full object-cover"></div>` :
            `<div class="user-avatar-small ml-3"><i class="fa fa-user"></i></div>`;
            
        const c = appData.chatObjects.find(c => c.id === appData.activeChatId);
        const aA = !c || !c.avatar || c.avatar.type === 'default' || !c.avatar.url ?
            `<div class="w-8 h-8 rounded-full bg-wechat-green flex items-center justify-center text-white mr-3 flex-shrink-0"><i class="fa fa-robot"></i></div>` :
            `<div class="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden"><img src="${escapeHtml(c.avatar.url)}" class="w-full h-full object-cover"></div>`;
        
        // 解析表情
        const parsedContent = parseMessageStickers(g.content); // Defined in stickers.js
        
        e.innerHTML = g.role === 'user' ?
            `<div class="chat-bubble-user"><p class="text-sm">${parsedContent}</p></div>${uA}` :
            `${aA}<div class="chat-bubble-ai"><p class="text-sm">${parsedContent}</p></div>`;
        DOM.chatPageContainer.appendChild(e);
    });
    
    setTimeout(() => { if (DOM.chatPageContainer) DOM.chatPageContainer.scrollTop = DOM.chatPageContainer.scrollHeight }, 100);
}

// 获取API上下文
function getHistoryForApi(m) {
    const t = appData.apiConfig.historyTurns;
    return (!t || t <= 0) ? m : m.slice(-t * 2);
}

// 发送或重新生成消息
async function sendOrRegenerate(contextMessages) {
    const chatIndex = appData.chatObjects.findIndex(c => c.id === appData.activeChatId);
    if (chatIndex < 0) return;
    const chat = appData.chatObjects[chatIndex];
    if (!appData.apiConfig.apiKey) { alert('请先在设置中填写API Key'); togglePage('settings', true); return; }

    DOM.chatPageTypingIndicator.classList.add('show');
    try {
        const diarySummary = chat.diaries.map(d => `[过往日记摘要]:\n${d.content}`).join('\n\n');
        const longTermMemoryContext = diarySummary ? `这是你和用户之间过往的对话摘要，请将此作为你的长期记忆：\n${diarySummary}\n\n` : '';
        
        // 表情提示
        let stickerHint = '';
        if (appData.stickers.length > 0) {
            const stickerNames = appData.stickers.map(s => `:${s.name}:`).join(' ');
            stickerHint = `\n\n【可用表情】你可以在回复中适当使用以下表情来增加表达效果：${stickerNames}\n使用格式：直接写 :表情名: 即可，例如"我很开心 :开心:"\n使用规则：
- 每次回复最多只能用1个表情
- 表情必须单独放在回复的最后一行
- 不要把表情和文字写在同一行
- 不是每次都要用表情，只在情绪特别强烈时偶尔使用一个表情，大部分回复不需要表情。`;
        }

        const systemPrompt = `${longTermMemoryContext}${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}${stickerHint}`.trim();
        const userName = appData.userInfo.name.trim() || 'user';
        
        let apiMessages = getHistoryForApi(contextMessages).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            name: m.role === 'user' ? userName : undefined,
            content: m.content
        }));

        const lastUserMessageIndex = apiMessages.map(m => m.role).lastIndexOf('user');
        if (lastUserMessageIndex > -1) {
            apiMessages[lastUserMessageIndex].content = `[当前时间: ${formatMessageTimestamp(Date.now())}]\n${apiMessages[lastUserMessageIndex].content}`;
        }
        
        const apiPayload = [{ role: 'system', content: systemPrompt }, ...apiMessages];
        
        // 调用API
        const data = await fetchWithRetry(
            `${appData.apiConfig.baseUrl}/chat/completions`, 
            { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` }, 
                body: JSON.stringify({ model: appData.apiConfig.modelName, messages: apiPayload, temperature: appData.apiConfig.temperature }) 
            }
        );

        const cleanedContent = cleanAiResponse(data.choices[0].message.content);

        // 处理表情
        const stickerPattern = /:([^:\s]+):/g;
        const allStickers = cleanedContent.match(stickerPattern) || [];
        const lastSticker = allStickers.length > 0 ? allStickers[allStickers.length - 1] : null;
        const validSticker = lastSticker && appData.stickers.find(s => `:${s.name}:` === lastSticker) ? lastSticker : null;

        // 分割文字和表情
        let textContent = cleanedContent.replace(stickerPattern, '').trim();
        const firstNewlineIndex = textContent.indexOf('\n');
        let messageParts = (firstNewlineIndex === -1) 
            ? [textContent] 
            : [textContent.substring(0, firstNewlineIndex), textContent.substring(firstNewlineIndex + 1)];

        const finalMessages = messageParts.map(p => p.trim()).filter(p => p !== '');

        if (validSticker) {
            finalMessages.push(validSticker);
        }
        
        if (finalMessages.length > 0) { 
            finalMessages.forEach(part => { chat.messages.push({ role: 'assistant', content: part, timestamp: Date.now() }); }); 
        } else { 
            chat.messages.push({ role: 'assistant', content: "...", timestamp: Date.now() }); 
        }
        
        saveDataToStorage();
        renderChatMessages(chat.messages);
        
        // 尝试触发日记生成 (Defined in diary.js)
        if (typeof checkAndTriggerDiaryGeneration === 'function') {
            checkAndTriggerDiaryGeneration(chat);
        }

    } catch (e) {
        if (e.message === 'AllRetryAttemptsFailed') {
            logToUI('All retry attempts failed. Adding busy message.');
            chat.messages.push({
                role: 'assistant',
                content: "我现在有点忙，稍后再聊",
                timestamp: Date.now()
            });
            saveDataToStorage();
            renderChatMessages(chat.messages);
        } else {
            alert(`出错了：${e.message}`);
        }
    } finally {
        DOM.chatPageTypingIndicator.classList.remove('show');
    }
}

// 重新生成回复
async function regenerateAiResponse(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || chat.messages[targetIndex].role !== 'assistant') return;
    
    const isMidConversation = chat.messages.some((msg, index) => index > targetIndex);
    if (isMidConversation) { 
        if (!confirm("您正在尝试重新生成一条历史消息。\n\n确认后，此消息及其之后的所有对话都将被删除并重新生成。\n\n您确定要继续吗？")) return; 
    }
    
    let turnStartIndex = targetIndex;
    while (turnStartIndex > 0 && chat.messages[turnStartIndex - 1].role === 'assistant') { turnStartIndex--; }
    
    const contextForApi = chat.messages.slice(0, turnStartIndex);
    chat.messages.length = turnStartIndex;
    renderChatMessages(chat.messages);
    await sendOrRegenerate(contextForApi);
}

// 删除消息
function deleteMessage(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || targetIndex >= chat.messages.length) return;
    
    const isLastMessage = targetIndex === chat.messages.length - 1;
    
    if (isLastMessage) {
        if (!confirm('确定要删除这条消息吗？')) return;
        chat.messages.splice(targetIndex, 1);
    } else {
        const choice = confirm('点击"确定"：删除这条及之后的所有消息\n点击"取消"：仅删除这一条');
        if (choice) {
            chat.messages.length = targetIndex;
        } else {
            chat.messages.splice(targetIndex, 1);
        }
    }
    
    saveDataToStorage();
    renderChatMessages(chat.messages);
}

// 编辑消息
function editMessage(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || targetIndex >= chat.messages.length) return;
    
    const oldContent = chat.messages[targetIndex].content;
    const newContent = prompt('修改消息内容：', oldContent);
    if (newContent === null || newContent.trim() === '') return;
    
    chat.messages[targetIndex].content = newContent.trim();
    saveDataToStorage();
    renderChatMessages(chat.messages);
}

// 重新发送消息
async function resendMessage(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || chat.messages[targetIndex].role !== 'user') return;
    
    chat.messages.length = targetIndex + 1;
    saveDataToStorage();
    renderChatMessages(chat.messages);
    await sendOrRegenerate(chat.messages);
}

// 滑动删除设置
function setupSwipeToDelete(w, id) {
    let s = 0;
    w.addEventListener('touchstart', (e) => { s = e.touches[0].clientX });
    w.addEventListener('touchmove', (e) => { w.classList.toggle('swipe-left', s - e.touches[0].clientX > 30) });
    w.addEventListener('touchend', () => {});
    w.querySelector('.slide-delete-btn').addEventListener('click', () => showConfirmDeleteModal(id));
}

// 显示删除确认
function showConfirmDeleteModal(id) {
    appData.editChatTempData.chatId = id;
    DOM.confirmDeleteModal.classList.remove('hidden');
    document.querySelectorAll('.chat-item-wrapper.swipe-left').forEach(w => w.classList.remove('swipe-left'));
}

function hideConfirmDeleteModal() {
    DOM.confirmDeleteModal.classList.add('hidden');
    appData.editChatTempData.chatId = null;
}

// 发送消息入口
async function sendChatMessage() {
    const t = DOM.chatPageMessageInput.value.trim();
    if (!t || !appData.activeChatId) return;
    const i = appData.chatObjects.findIndex(c => c.id === appData.activeChatId);
    if (i < 0) return;
    
    const chat = appData.chatObjects[i];
    chat.messages.push({ role: 'user', content: t, timestamp: Date.now() });
    saveDataToStorage();
    renderChatMessages(chat.messages);
    
    closeStickerPanel(); // Defined in stickers.js
    DOM.chatPageMessageInput.value = '';
    DOM.chatPageMessageInput.style.height = 'auto';
    
    await sendOrRegenerate(chat.messages);
}
