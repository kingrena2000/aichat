/**
 * api.js - 聊天 API 辅助（非模块版）
 * 说明：当前页面通过普通 <script> 加载，避免使用 ES Module import/export。
 */
(function (global) {
  function getHistoryForApi(messages, historyTurns) {
    const turns = Number(historyTurns || 0);
    return (!turns || turns <= 0) ? messages : messages.slice(-turns * 2);
  }

  function buildChatCompletionPayload({ appData, chat, contextMessages, nowText, userName }) {
    const diarySummary = (chat.diaries || []).map(d => `[过往日记摘要]:\n${d.content}`).join('\n\n');
    const longTermMemoryContext = diarySummary
      ? `这是你和用户之间过往的对话摘要，请将此作为你的长期记忆：\n${diarySummary}\n\n`
      : '';

    let stickerHint = '';
    if ((appData.stickers || []).length > 0) {
      const stickerNames = appData.stickers.map(s => `:${s.name}:`).join(' ');
      stickerHint = `\n\n【可用表情】你可以在回复中适当使用以下表情来增加表达效果：${stickerNames}\n使用格式：直接写:表情名: 即可，例如"我很开心 :开心:"\n使用规则：
- 每次回复最多只能用1个表情
- 表情必须单独放在回复的最后一行
- 不要把表情和文字写在同一行
- 不是每次都要用表情，只在情绪特别强烈时偶尔使用一个表情，大部分回复不需要表情。`;
    }

    const systemPrompt = `${longTermMemoryContext}${appData.apiConfig.globalSystemPrompt}\n\n${chat.systemPrompt}${stickerHint}`.trim();

    const apiMessages = getHistoryForApi(contextMessages, appData.apiConfig.historyTurns).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      name: m.role === 'user' ? userName : undefined,
      content: m.content
    }));

    const lastUserMessageIndex = apiMessages.map(m => m.role).lastIndexOf('user');
    if (lastUserMessageIndex > -1) {
      apiMessages[lastUserMessageIndex].content = `[当前时间: ${nowText}]\n${apiMessages[lastUserMessageIndex].content}`;
    }

    return [{ role: 'system', content: systemPrompt }, ...apiMessages];
  }

  async function requestChatCompletion({ appData, payload }) {
    const data = await fetchWithRetry(
      `${appData.apiConfig.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appData.apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: appData.apiConfig.modelName,
          messages: payload,
          temperature: appData.apiConfig.temperature
        })
      }
    );
    return data.choices[0].message.content;
  }

  global.ChatApi = {
    buildChatCompletionPayload,
    requestChatCompletion
  };
})(window);
