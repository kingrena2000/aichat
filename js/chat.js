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

    const originalChat = appData.chatObjects[chatIndex];
    const isGroup = !!originalChat.isGroup;

    let updatedChat;
    if (isGroup) {
        const selectedIds = [...document.querySelectorAll('.edit-group-member-checkbox:checked')].map(cb => cb.dataset.chatId);
        if (selectedIds.length < 2) { alert('群聊至少保留2个成员'); return; }

        updatedChat = {
            ...originalChat,
            name: DOM.editChatName.value.trim() || '群聊',
            members: selectedIds,
            avatar: { ...appData.editChatTempData.avatar }
        };
    } else {
        updatedChat = {
            ...originalChat,
            name: DOM.editChatName.value.trim() || 'AI助手',
            systemPrompt: DOM.editChatSystemPrompt.value.trim() || '你是一个友好、helpful 的AI助手。',
            avatar: { ...appData.editChatTempData.avatar }
        };
    }

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

        // 群聊：多轮接话引擎（随机顺序、逐个读取、全员沉默即停止）
        if (chat.isGroup && Array.isArray(chat.members) && chat.members.length > 0) {
            logToUI(`[群聊引擎] 启动：${chat.name}，消息数=${chat.messages?.length || 0}`);
            if (chat.muted) { logToUI('[群聊引擎] 终止：全员禁言'); return; }

            const fullText = (chat.messages || []).map(m => `${m.role}:${m.senderName ? `[${m.senderName}]` : ''}${m.content || ''}`).join('\n');
            const approxTokens = Math.ceil((fullText.length || 0) / 2);
            if (approxTokens > 50000) {
                chat.messages.push({
                    role: 'assistant',
                    senderName: '系统',
                    content: '群聊历史内容已超过 5W token，请先清理群聊记录后再继续。',
                    timestamp: Date.now()
                });
                saveDataToStorage();
                ChatMessageUI.renderChatMessages(chat.messages);
                return;
            }

            const memberChats = chat.members
                .map(id => appData.chatObjects.find(c => c.id === id && !c.isGroup))
                .filter(Boolean);

            if (memberChats.length === 0) {
                chat.messages.push({ role: 'assistant', content: '这个群还没有可用成员，请先添加成员。', timestamp: Date.now() });
                saveDataToStorage();
                ChatMessageUI.renderChatMessages(chat.messages);
                return;
            }

            const maxRounds = 8;
            const maxAiMessagesPerRun = 20;
            const maxDurationMs = 30000;
            const runStart = Date.now();
            let aiMessagesCount = 0;

            const toContextMessages = () => [{
                role: 'user',
                content: `【群聊记录】\n${(chat.messages || []).map(m => {
                    if (m.role === 'assistant') {
                        return `${m.senderName || '群成员'}：${m.content || ''}`;
                    }
                    return `${userName}：${m.content || ''}`;
                }).join('\n')}`
            }];

            const shuffle = (arr) => {
                const a = [...arr];
                for (let i = a.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [a[i], a[j]] = [a[j], a[i]];
                }
                return a;
            };

            const silentSignals = ['[沉默]', '（沉默）', '(沉默)', '不发言', '保持沉默', 'PASS', 'pass'];
            const extractMentionedMemberIds = () => {
                const lastUserMessage = [...(chat.messages || [])].reverse().find(m => m.role === 'user');
                const text = lastUserMessage?.content || '';
                return new Set(memberChats
                    .filter(member => member.name && text.includes(member.name))
                    .map(member => member.id));
            };
            const mentionedMemberIds = extractMentionedMemberIds();
            logToUI(`[群聊引擎] 成员=${memberChats.map(m => m.name).join('、')}；被点名=${memberChats.filter(m => mentionedMemberIds.has(m.id)).map(m => m.name).join('、') || '无'}`);

            for (let round = 1; round <= maxRounds; round++) {
                if (chat.muted) { logToUI(`[群聊引擎] 第${round}轮前终止：全员禁言`); break; }
                if (Date.now() - runStart > maxDurationMs) { logToUI(`[群聊引擎] 第${round}轮前终止：超过${maxDurationMs}ms`); break; }
                if (aiMessagesCount >= maxAiMessagesPerRun) { logToUI(`[群聊引擎] 第${round}轮前终止：AI消息数达到${aiMessagesCount}`); break; }

                let hasAnySpeechInRound = false;
                const orderedMembers = shuffle(memberChats);
                logToUI(`[群聊引擎] 第${round}轮开始，顺序=${orderedMembers.map(m => m.name).join(' → ')}`);

                for (const member of orderedMembers) {
                    if (chat.muted) { logToUI(`[群聊引擎] 第${round}轮中断：全员禁言`); break; }
                    if (Date.now() - runStart > maxDurationMs) { logToUI(`[群聊引擎] 第${round}轮中断：超过${maxDurationMs}ms`); break; }
                    if (aiMessagesCount >= maxAiMessagesPerRun) { logToUI(`[群聊引擎] 第${round}轮中断：AI消息数达到${aiMessagesCount}`); break; }

                    const wasMentioned = mentionedMemberIds.has(member.id);
                    ChatMessageUI.showTypingIndicator(member.name, member.avatar);
                    const memberChatView = {
                        ...chat,
                        systemPrompt: `${member.systemPrompt || `你是${member.name}`}

【群聊发言规则】
- 你正在一个多人群聊中，不是“群助手”。
- 你只代表“${member.name}”这个成员发言。
- 你会看到群聊上下文，但其他成员的话只是上下文，不是你的发言，也不是你的人设。
- 如果上一条是其他成员的发言，你可以像真实群聊一样自然接话、回应、补充或打趣。
- 不要只回答用户第一句话，也要关注群里最新一条消息。
- 严禁模仿、续写、代替其他成员；只能用“${member.name}”自己的人设和口吻回应。
${wasMentioned ? '- 用户刚刚点名了你，本轮必须回应用户，不要沉默。\n' : ''}- 如果用户点名了你，请优先回应，不要沉默。
- 如果你没有必要发言，请只输出：[沉默]
- 如果需要发言，再自然回复一句。
- 不要在回复前加名字，不要写“${member.name}：”，不要写“群助手”。`
                    };

                    const apiPayload = ChatApi.buildChatCompletionPayload({
                        appData,
                        chat: memberChatView,
                        contextMessages: toContextMessages(),
                        nowText: formatMessageTimestamp(Date.now()),
                        userName
                    });

                    const rawContent = await ChatApi.requestChatCompletion({ appData, payload: apiPayload });
                    ChatMessageUI.hideTypingIndicator();
                    const cleanedContent = cleanAiResponse(rawContent);
                    const normalized = (cleanedContent || '').trim();
                    const isSilent = !normalized || silentSignals.some(s => normalized === s || normalized.includes(s));
                    if (isSilent) {
                        logToUI(`[群聊引擎] 第${round}轮 ${member.name}：沉默，原始=${JSON.stringify(rawContent).slice(0, 120)}`);
                        continue;
                    }
                    logToUI(`[群聊引擎] 第${round}轮 ${member.name}：发言=${normalized.slice(0, 120)}`);

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
                    if (validSticker) finalMessages.push(validSticker);

                    if (finalMessages.length > 0) {
                        finalMessages.forEach(part => {
                            chat.messages.push({
                                role: 'assistant',
                                senderName: member.name,
                                senderId: member.id,
                                content: part,
                                timestamp: Date.now()
                            });
                            aiMessagesCount++;
                        });
                        hasAnySpeechInRound = true;
                        saveDataToStorage();
                        ChatMessageUI.renderChatMessages(chat.messages);
                    }
                }

                if (!hasAnySpeechInRound) {
                    logToUI(`[群聊引擎] 第${round}轮结束：全员沉默，run停止`);
                    break;
                }
                logToUI(`[群聊引擎] 第${round}轮结束：有人发言，继续下一轮；累计AI消息=${aiMessagesCount}`);
            }

            logToUI(`[群聊引擎] run结束：累计AI消息=${aiMessagesCount}，耗时=${Date.now() - runStart}ms`);
            return;
        }

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
