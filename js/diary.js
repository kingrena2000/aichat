/* =========================================================================
   微信风格多AI聊天 - 日记功能模块 (diary.js)
   ========================================================================= */

// 检查并触发日记生成
async function checkAndTriggerDiaryGeneration(chat) {
    logToUI('自动总结检查: 开始。');
    if (appData.isGeneratingDiary) {
        logToUI("自动总结检查: 检测到已有任务在运行，跳过。");
        return;
    }
    const threshold = parseInt(appData.apiConfig.diaryGenerationTurns, 10);
    if (!threshold || threshold <= 0) return;
    
    const lastIndex = chat.lastDiaryIndex || 0;
    const messagesSinceLastDiary = chat.messages.slice(lastIndex);
    const aiRepliesSinceLastDiary = messagesSinceLastDiary.filter(m => m.role === 'assistant').length;
    
    logToUI(`自动总结检查: lastDiaryIndex=${lastIndex}, messages.length=${chat.messages.length}, 新AI回复数=${aiRepliesSinceLastDiary}, 阈值=${threshold}`);
    
    if (aiRepliesSinceLastDiary >= threshold) {
        logToUI(`自动总结检查: 达到阈值，准备触发。`);
        let turnsCounted = 0;
        let endIndex = 0;
        for (let i = 0; i < messagesSinceLastDiary.length; i++) {
            if (messagesSinceLastDiary[i].role === 'assistant') {
                turnsCounted++;
            }
            if (turnsCounted === threshold) {
                endIndex = i + 1;
                break;
            }
        }
        const messagesToSummarize = messagesSinceLastDiary.slice(0, endIndex);
        appData.isGeneratingDiary = true;
        logToUI("自动总结检查: **上锁**，开始生成。待总结消息数: " + messagesToSummarize.length);
        try {
            await generateDiaryEntry(chat, messagesToSummarize, lastIndex);
        } finally {
            appData.isGeneratingDiary = false;
            logToUI("自动总结检查: **解锁**，任务结束。");
        }
    } else {
        logToUI('自动总结检查: 未达到阈值，无操作。');
    }
}

// 重置日记指针
function resetDiaryPointer() {
    const chat = appData.chatObjects.find(c => c.id === appData.diaryView.activeChatId);
    if (!chat) return;
    if (confirm(`确定要重置【${chat.name}】的日记指针吗？\n\n这将让程序认为所有聊天记录都是“新的”，可以被重新总结。当总结功能失效时，这是一个有效的修复手段。`)) {
        const oldIndex = chat.lastDiaryIndex || 0;
        chat.lastDiaryIndex = 0;
        saveDataToStorage();
        alert("日记指针已重置为0！现在您可以尝试手动总结了。");
        logToUI(`指针重置: Chat [${chat.name}] 的 lastDiaryIndex 已被手动从 ${oldIndex} 重置为 0。`);
    }
}

// 手动生成日记
async function manualGenerateDiary() {
    logToUI('手动总结: 开始。');
    if (appData.isGeneratingDiary) {
        alert("正在生成上一篇日记，请稍后再试。");
        logToUI('手动总结: 检测到已有任务在运行，已阻止。');
        return;
    }
    const chat = appData.chatObjects.find(c => c.id === appData.diaryView.activeChatId);
    if (!chat) return;
    
    const lastIndex = chat.lastDiaryIndex || 0;
    const messagesToSummarize = chat.messages.slice(lastIndex);
    
    logToUI(`手动总结: lastDiaryIndex=${lastIndex}, messages.length=${chat.messages.length}, 待总结消息数=${messagesToSummarize.length}`);
    
    if (messagesToSummarize.length === 0) {
        alert("没有需要总结的新内容。如果确定有新内容但此处为0，请先“重置指针”。");
        logToUI('手动总结: 没有新消息，已中止。');
        return;
    }
    
    appData.isGeneratingDiary = true;
    logToUI("手动总结: **上锁**，开始生成。");
    
    const btn = DOM.manualDiaryBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin mr-1"></i>总结中...';
    btn.disabled = true;
    
    try {
        const success = await generateDiaryEntry(chat, messagesToSummarize, lastIndex);
        if (success) {
            alert("手动总结成功！");
        } else {
            alert("总结失败，可能是网络问题或API错误。请从“设置”页面打开日志查看详情。");
        }
    } finally {
        appData.isGeneratingDiary = false;
        btn.innerHTML = originalText;
        btn.disabled = false;
        logToUI("手动总结: **解锁**，任务结束。");
    }
}

// 生成日记核心逻辑
async function generateDiaryEntry(chat, messagesToSummarize, startIndex) {
    logToUI(`核心总结: 开始为 ${messagesToSummarize.length} 条消息生成日记，起始索引: ${startIndex}`);
    const today = new Date();
    const dateString = `${today.getFullYear()}年${(today.getMonth() + 1).toString().padStart(2, '0')}月${today.getDate().toString().padStart(2, '0')}日`;
    const userName = appData.userInfo.name.trim() || '用户';
    
    const systemRolePrompt = `你正在扮演一个角色，现在需要写一段简短的内心备忘，包含两部分：

1.【心声】你对'${userName}'的真实内心想法（100字以内）
- 不要复述对话内容
- 表达你对${userName}的感情、牵挂、欣赏或思念
- 可以写你注意到的${userName}的小细节、让你心动的瞬间
- 禁止写"没什么特别"之类的敷衍内容，每一天都值得珍惜

2.【记住】需要永久记住的重要信息（可选，每条不超过20字）
- 只记录关键事实：如姓名、生日、喜好、重要事件、承诺等
- 如果没有需要特别记住的内容，可以不写这部分
- 用简短的条目列出

格式如下，严格遵守：

【${dateString}】
【心声】（你的内心独白，要有感情）
【记住】
- 条目1
- 条目2`;

    const userRolePrompt = `以下是最近的对话，写下你的内心备忘：\n\n${messagesToSummarize.map(m => `${m.role === 'user' ? userName : '我'}: ${m.content}`).join('\n')}`;

    try {
        const response = await fetch(`${appData.apiConfig.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${appData.apiConfig.apiKey}` },
            body: JSON.stringify({
                model: appData.apiConfig.modelName,
                messages: [{ role: 'system', content: systemRolePrompt }, { role: 'user', content: userRolePrompt }],
                temperature: appData.apiConfig.temperature
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI日记生成API请求失败 (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        const diaryContent = cleanAiResponse(data.choices[0].message.content); // Defined in utils.js
        
        if (diaryContent) {
            chat.diaries.push({ id: generateUniqueId(), content: diaryContent, timestamp: Date.now() });
            const oldIndex = chat.lastDiaryIndex || 0;
            chat.lastDiaryIndex = startIndex + messagesToSummarize.length;
            saveDataToStorage();
            logToUI(`核心总结: 成功！日记已保存。lastDiaryIndex 从 ${oldIndex} 更新为 ${chat.lastDiaryIndex}`);
            
            if (appData.diaryView.activeChatId === chat.id && !DOM.diaryDetailPage.classList.contains('translate-x-full')) {
                renderDiaryEntries();
            }
            return true;
        }
        logToUI("核心总结: 失败，AI返回内容为空。");
        return false;
    } catch (e) {
        logToUI(`核心总结: 捕获到严重错误: ${e.message}`);
        console.error("日记生成失败:", e);
        return false;
    }
}

// 渲染日记列表
function renderDiaryList() {
    DOM.diaryListContainer.innerHTML = '';
    if (appData.chatObjects.length === 0) {
        DOM.diaryListContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-wechat-lightText py-10"><i class="fa fa-book text-4xl mb-3 opacity-50"></i><p class="text-sm">暂无聊天对象，无法查看日记</p></div>`;
        return;
    }
    appData.chatObjects.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'flex items-center p-4 border-b border-wechat-darkGray cursor-pointer';
        item.dataset.chatId = chat.id;
        item.innerHTML = `<div class="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
            ${chat.avatar && chat.avatar.type !== 'default' && chat.avatar.url ? 
            `<img src="${escapeHtml(chat.avatar.url)}" alt="${escapeHtml(chat.name)}" class="w-full h-full object-cover">` : 
            `<div class="w-full h-full bg-wechat-green flex items-center justify-center text-white"><i class="fa fa-robot"></i></div>`}
        </div>
        <div class="flex-1 min-w-0">
            <h3 class="font-medium text-wechat-text truncate">${escapeHtml(chat.name)}</h3>
            <p class="text-xs text-wechat-lightText truncate mt-1">${chat.diaries.length}篇日记</p>
        </div>`;
        item.addEventListener('click', () => openDiaryDetail(chat.id));
        DOM.diaryListContainer.appendChild(item);
    });
}

// 打开日记详情
function openDiaryDetail(chatId) {
    const chat = appData.chatObjects.find(c => c.id === chatId);
    if (!chat) return;
    appData.diaryView.activeChatId = chatId;
    DOM.diaryDetailPageTitle.textContent = `${chat.name}的日记本`;
    renderDiaryEntries();
    DOM.diaryDetailPage.classList.remove('translate-x-full');
}

// 渲染日记条目
function renderDiaryEntries() {
    DOM.diaryEntriesContainer.innerHTML = '';
    const chat = appData.chatObjects.find(c => c.id === appData.diaryView.activeChatId);
    if (!chat || chat.diaries.length === 0) {
        DOM.diaryEntriesContainer.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-wechat-lightText py-10"><i class="fa fa-pencil-square-o text-4xl mb-3 opacity-50"></i><p class="text-sm">还没有任何日记条目</p><p class="text-xs mt-2">与Ta多聊聊，或点击右上角手动总结</p></div>`;
        return;
    }
    
    [...chat.diaries].sort((a, b) => b.timestamp - a.timestamp).forEach(entry => {
        const card = document.createElement('div');
        card.className = 'diary-entry-card relative';
        card.innerHTML = `<p class="text-xs text-diary-text/60 mb-2">${getFormattedTimestamp(entry.timestamp)}</p>
        <p class="text-sm text-diary-text leading-relaxed">${escapeHtml(entry.content)}</p>
        <div class="absolute top-2 right-2 flex gap-2">
            <button data-entry-id="${entry.id}" class="edit-diary-btn text-diary-text/50 hover:text-wechat-green p-1"><i class="fa fa-pencil"></i></button>
            <button data-entry-id="${entry.id}" class="delete-diary-btn text-diary-text/50 hover:text-wechat-red p-1"><i class="fa fa-trash"></i></button>
        </div>`;
        
        card.querySelector('.edit-diary-btn').addEventListener('click', (e) => { e.stopPropagation(); showEditDiaryModal(entry.id); });
        card.querySelector('.delete-diary-btn').addEventListener('click', (e) => { e.stopPropagation(); if (confirm('确定要删除这篇日记吗？此操作不可恢复。')) deleteDiaryEntry(entry.id); });
        DOM.diaryEntriesContainer.appendChild(card);
    });
}

// 编辑/删除辅助
function showEditDiaryModal(entryId) {
    const chat = appData.chatObjects.find(c => c.id === appData.diaryView.activeChatId);
    const entry = chat?.diaries.find(d => d.id === entryId);
    if (!entry) return;
    appData.diaryView.editingEntryId = entryId;
    DOM.editDiaryEntryText.value = entry.content;
    DOM.editDiaryEntryModal.classList.remove('hidden');
}

function closeEditDiaryModal() {
    DOM.editDiaryEntryModal.classList.add('hidden');
    appData.diaryView.editingEntryId = null;
}

function saveDiaryEntry() {
    const chat = appData.chatObjects.find(c => c.id === appData.diaryView.activeChatId);
    const entry = chat?.diaries.find(d => d.id === appData.diaryView.editingEntryId);
    if (!entry) return;
    entry.content = DOM.editDiaryEntryText.value;
    entry.timestamp = Date.now();
    saveDataToStorage();
    renderDiaryEntries();
    closeEditDiaryModal();
}

function deleteDiaryEntry(entryId) {
    const chatIndex = appData.chatObjects.findIndex(c => c.id === appData.diaryView.activeChatId);
    if (chatIndex === -1) return;
    appData.chatObjects[chatIndex].diaries = appData.chatObjects[chatIndex].diaries.filter(d => d.id !== entryId);
    saveDataToStorage();
    renderDiaryEntries();
}
