/*=========================================================================微信风格多AI聊天 - 聊天功能模块 (chat.js)
   ========================================================================= */

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
        systemPrompt: DOM.newChatSystemPrompt.value.trim() || '你是一个友好、helpful的AI助手。',
        messages: [],
        diaries: [],
        lastDiaryIndex: 0,
        createdAt: Date.now()
    };
    appData.chatObjects.push(nC);
    saveDataToStorage();
    closeAddChatModal();
    renderChatList();
    if (typeof renderDiaryList === 'function' && isDiaryPageVisible()) renderDiaryList();openChat(nC.id);
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
    if (appData.activeChatId === updatedChat.id) openChat(updatedChat.id);DOM.chatDetailPage.classList.add('translate-x-full');
}

// 发送或重新生成消息
async function sendOrRegenerate(contextMessages) {
    const chatIndex = appData.chatObjects.findIndex(c => c.id === appData.activeChatId);
    if (chatIndex < 0) return;
    const chat = appData.chatObjects[chatIndex];
    if (!appData.apiConfig.apiKey) { alert('请先在设置中填写API Key'); togglePage('settings', true); return; }

    //★ 改用动态注入的打字指示器
    ChatMessageUI.showTypingIndicator();
    try {
        const userName = appData.userInfo.name.trim() || 'user';

        const apiPayload = ChatApi.buildChatCompletionPayload({
            appData,
            chat,
            contextMessages,
            nowText: formatMessageTimestamp(Date.now()),
            userName
        });

        const rawContent = await ChatApi.requestChatCompletion({ appData, payload: apiPayload });
        const cleanedContent = cleanAiResponse(rawContent);

        const stickerPattern = /:([^:\s]+):/g;
        const allStickers = cleanedContent.match(stickerPattern) || [];
        const lastSticker = allStickers.length > 0 ? allStickers[allStickers.length - 1] : null;
        const validSticker = lastSticker && appData.stickers.find(s => `:${s.name}:` === lastSticker) ? lastSticker : null;

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
        // ★ renderChatMessages 会清空容器，typing bubble 也会被清除
        ChatMessageUI.renderChatMessages(chat.messages);
        
        if (typeof checkAndTriggerDiaryGeneration === 'function') {
            checkAndTriggerDiaryGeneration(chat);
        }} catch (e) {
        if (e.message === 'AllRetryAttemptsFailed') {
            logToUI('All retry attempts failed. Adding busy message.');
            chat.messages.push({
                role: 'assistant',
                content: "我现在有点忙，稍后再聊",
                timestamp: Date.now()
            });
            saveDataToStorage();
            ChatMessageUI.renderChatMessages(chat.messages);
        } else {
            alert(`出错了：${e.message}`);
        }
    } finally {
        // ★ 兜底清除（renderChatMessages已经清了，这里做保险）
        ChatMessageUI.hideTypingIndicator();
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
    ChatMessageUI.renderChatMessages(chat.messages);
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
    ChatMessageUI.renderChatMessages(chat.messages);
}

// 编辑消息 — 自定义弹窗 + textarea多行编辑
function editMessage(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || targetIndex >= chat.messages.length) return;

    var modal = document.getElementById('editMessageModal');
    var textArea = document.getElementById('editMessageText');
    var saveBtn = document.getElementById('saveEditMessageBtn');
    var cancelBtn = document.getElementById('cancelEditMessageBtn');
    var closeBtn = document.getElementById('closeEditMessageModalBtn');

    // 填入原内容
    textArea.value = chat.messages[targetIndex].content;
    modal.classList.remove('hidden');

    // 自动聚焦并把光标放到末尾
    setTimeout(function () {
        textArea.focus();
        textArea.selectionStart = textArea.selectionEnd = textArea.value.length;
    }, 100);

    // 根据内容自动调整高度（最少4行，最多12行）
    function autoResize() {
        textArea.style.height = 'auto';
        var lineHeight = 27; // 约text-sm * 1.8
        var minH = lineHeight * 4;
        var maxH = lineHeight * 12;
        var scrollH = textArea.scrollHeight;
        textArea.style.height = Math.min(Math.max(scrollH, minH), maxH) + 'px';
    }
    autoResize();
    textArea.addEventListener('input', autoResize);

    function closeModal() {
        modal.classList.add('hidden');
        textArea.removeEventListener('input', autoResize);
        saveBtn.removeEventListener('click', onSave);
        cancelBtn.removeEventListener('click', closeModal);
        closeBtn.removeEventListener('click', closeModal);}

    function onSave() {
        var newContent = textArea.value.trim();
        if (newContent === '') return;
        chat.messages[targetIndex].content = newContent;
        saveDataToStorage();
        ChatMessageUI.renderChatMessages(chat.messages);
        closeModal();
    }

    saveBtn.addEventListener('click', onSave);
    cancelBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
}


// 重新发送消息
async function resendMessage(targetIndex) {
    if (targetIndex === null || !appData.activeChatId) return;
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat || targetIndex < 0 || chat.messages[targetIndex].role !== 'user') return;
    
    chat.messages.length = targetIndex + 1;
    saveDataToStorage();
    ChatMessageUI.renderChatMessages(chat.messages);
    await sendOrRegenerate(chat.messages);
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
    ChatMessageUI.renderChatMessages(chat.messages);
    
    closeStickerPanel();
    DOM.chatPageMessageInput.value = '';
    DOM.chatPageMessageInput.style.height = 'auto';
    
    await sendOrRegenerate(chat.messages);
}
