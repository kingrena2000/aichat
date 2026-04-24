/*=========================================================================
   聊天消息渲染模块 (message.js)
   ========================================================================= */

(function (global) {
  // 动态显示打字指示器（注入到聊天内容区底部，像一条真实消息）
  function showTypingIndicator() {
    hideTypingIndicator(); // 先清除已有的
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    if (!chat) return;

    const avatarHtml = (chat.avatar && chat.avatar.type !== 'default' && chat.avatar.url)
      ? `<div class="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden"><img src="${escapeHtml(chat.avatar.url)}" class="w-full h-full object-cover"></div>`
      : `<div class="w-8 h-8 rounded-full bg-wechat-green flex items-center justify-center text-white mr-3 flex-shrink-0"><i class="fa fa-robot"></i></div>`;

    const el = document.createElement('div');
    el.id = 'typingBubble';
    el.className = 'flex items-start mb-6';
    el.innerHTML = `${avatarHtml}<div class="chat-bubble-ai"><p class="text-sm text-wechat-lightText">${escapeHtml(chat.name)}正在输入<span class="typing-dot-anim"><span></span><span></span><span></span></span></p></div>`;

    DOM.chatPageContainer.appendChild(el);
    setTimeout(() => {
      if (DOM.chatPageContainer) DOM.chatPageContainer.scrollTop = DOM.chatPageContainer.scrollHeight;
    }, 50);
  }

  // 移除打字指示器
  function hideTypingIndicator() {
    const el = document.getElementById('typingBubble');
    if (el) el.remove();
  }

  // 渲染聊天消息
  function renderChatMessages(messages) {
    const chat = appData.chatObjects.find(c => c.id === appData.activeChatId);
    const isGroupChat = chat?.isGroup;

    DOM.chatPageContainer.innerHTML = messages.length === 0
      ? `<div class="flex flex-col items-center justify-center h-full text-wechat-lightText py-10"><i class="fa fa-comments-o text-4xl mb-3opacity-50"></i><p class="text-sm">发送第一条消息开始对话吧</p></div>`
      : '';
    if (messages.length === 0) return;

    messages.forEach((g, x) => {
      const e = document.createElement('div');
      e.className = `flex items-start mb-6 ${g.role === 'user' ? 'justify-end' : ''}`;
      e.dataset.messageRole = g.role;
      e.dataset.messageIndex = x;

      const userAvatarHtml = appData.userInfo.avatar && appData.userInfo.avatar.type !== 'default' && appData.userInfo.avatar.url
        ? `<div class="w-8 h-8 rounded-full overflow-hidden ml-3 flex-shrink-0"><img src="${escapeHtml(appData.userInfo.avatar.url)}" class="w-full h-full object-cover"></div>`
        : `<div class="user-avatar-small ml-3"><i class="fa fa-user"></i></div>`;

      const aiAvatarHtml = !chat || !chat.avatar || chat.avatar.type === 'default' || !chat.avatar.url
        ? `<div class="w-8 h-8 rounded-full bg-wechat-green flex items-center justify-center text-white mr-3 flex-shrink-0"><i class="fa fa-robot"></i></div>`
        : `<div class="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden"><img src="${escapeHtml(chat.avatar.url)}" class="w-full h-full object-cover"></div>`;

      const parsedContent = parseMessageStickers(g.content);
      const showSenderName = isGroupChat && g.role === 'assistant' && g.senderName;

      e.innerHTML = g.role === 'user'
        ? `<div class="chat-bubble-user"><p class="text-sm">${parsedContent}</p></div>${userAvatarHtml}`
        : `
          ${aiAvatarHtml}
          <div class="chat-bubble-ai">
            ${showSenderName ? `<span class="text-xs text-wechat-lightText mb-1 block">${escapeHtml(g.senderName)}</span>` : ''}
            <p class="text-sm">${parsedContent}</p>
          </div>`;
      DOM.chatPageContainer.appendChild(e);
    });

    setTimeout(() => {
      if (DOM.chatPageContainer) DOM.chatPageContainer.scrollTop = DOM.chatPageContainer.scrollHeight;
    }, 100);
  }

  global.ChatMessageUI = {
    showTypingIndicator,
    hideTypingIndicator,
    renderChatMessages
  };
})(window);
