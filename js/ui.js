/*=========================================================================
   聊天 UI 交互模块 (ui.js)
   ========================================================================= */

(function (global) {
  // 渲染聊天列表
  function renderChatList() {
    DOM.chatListContainer.innerHTML = '';
    if (appData.chatObjects.length === 0) {
      DOM.emptyChatList.classList.remove('hidden');
      return;
    }
    DOM.emptyChatList.classList.add('hidden');

    [...appData.chatObjects]
      .sort((a, b) => (b.messages.slice(-1)[0]?.timestamp || b.createdAt) - (a.messages.slice(-1)[0]?.timestamp || a.createdAt))
      .forEach(c => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'chat-item-container relative';

        const wrapper = document.createElement('div');
        wrapper.className = 'chat-item-wrapper';

        const item = document.createElement('div');
        item.className = 'flex items-center flex-1 p-4 border-b border-wechat-darkGray cursor-pointer';
        item.dataset.chatId = c.id;

        const last = c.messages.length > 0 ? c.messages[c.messages.length - 1].content : '暂无消息';

        item.innerHTML = `<div class="w-12 h-12 rounded-full overflow-hidden mr-3 flex-shrink-0">
            ${c.avatar && c.avatar.type !== 'default' && c.avatar.url
              ? `<img src="${escapeHtml(c.avatar.url)}" alt="${escapeHtml(c.name)}" class="w-full h-full object-cover">`
              : `<div class="w-full h-full bg-wechat-green flex items-center justify-center text-white"><i class="fa fa-robot"></i></div>`}
        </div>
        <div class="flex-1 min-w-0">
            <h3 class="font-medium text-wechat-text truncate">${escapeHtml(c.name)}</h3>
            <p class="text-xs text-wechat-lightText truncate mt-1">${escapeHtml(last.substring(0, 20) + (last.length > 20 ? '...' : ''))}</p>
        </div>`;

        const actions = document.createElement('div');
        actions.className = 'chat-item-actions';
        actions.innerHTML = `<button class="edit-action-btn" title="编辑" data-chat-id="${c.id}"><i class="fa fa-pencil"></i></button>
        <button class="delete-action-btn" title="删除" data-chat-id="${c.id}"><i class="fa fa-trash"></i></button>`;

        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'slide-delete-btn';
        deleteBtn.innerHTML = '<i class="fa fa-trash mr-1"></i>移除';

        wrapper.append(item, deleteBtn);
        itemContainer.append(wrapper, actions);
        DOM.chatListContainer.appendChild(itemContainer);

        setupSwipeToDelete(wrapper, c.id);
        item.addEventListener('click', () => openChat(c.id));
        actions.querySelector('.edit-action-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openChatDetail(c.id);
        });
        actions.querySelector('.delete-action-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          showConfirmDeleteModal(c.id);
        });
      });
  }

  // 打开聊天界面
  function openChat(id) {
    const c = appData.chatObjects.find(chat => chat.id === id);
    if (!c) return;
    appData.activeChatId = id;
    saveDataToStorage();

    DOM.chatPageTitle.textContent = c.name;
    DOM.chatPageAvatar.innerHTML = c.avatar && c.avatar.type !== 'default' && c.avatar.url
      ? `<img src="${escapeHtml(c.avatar.url)}" alt="${escapeHtml(c.name)}" class="w-full h-full object-cover">`
      : `<div class="w-full h-full rounded-full bg-wechat-green flex items-center justify-center text-white"><i class="fa fa-robot"></i></div>`;

    ChatMessageUI.renderChatMessages(c.messages);
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
    const c = appData.chatObjects.find(chat => chat.id === id);
    if (!c) return;
    appData.editChatTempData = { chatId: id, avatar: { ...c.avatar } };
    DOM.editChatName.value = c.name;
    DOM.editChatSystemPrompt.value = c.systemPrompt;
    updateEditChatAvatarPreview();
    DOM.editAvatarContainer.classList.add('hidden');
    DOM.chatDetailPage.classList.remove('translate-x-full');
  }

  // 滑动删除设置
  function setupSwipeToDelete(wrapper, id) {
    let startX = 0;
    wrapper.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    wrapper.addEventListener('touchmove', (e) => {
      wrapper.classList.toggle('swipe-left', startX - e.touches[0].clientX > 30);
    });
    wrapper.addEventListener('touchend', () => {});
    wrapper.querySelector('.slide-delete-btn').addEventListener('click', () => showConfirmDeleteModal(id));
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

  global.ChatUI = {
    renderChatList,
    openChat,
    openChatDetail,
    setupSwipeToDelete,
    showConfirmDeleteModal,
    hideConfirmDeleteModal
  };

  // 兼容现有全局调用，减少改动面
  global.renderChatList = renderChatList;
  global.openChat = openChat;
  global.openChatDetail = openChatDetail;
  global.setupSwipeToDelete = setupSwipeToDelete;
  global.showConfirmDeleteModal = showConfirmDeleteModal;
  global.hideConfirmDeleteModal = hideConfirmDeleteModal;
})(window);
