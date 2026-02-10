/* =========================================================================
   微信风格多AI聊天 - 工具函数库 (utils.js)
   ========================================================================= */

// 生成唯一ID
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 格式化时间戳 (用于日志)
function getFormattedTimestamp(ts) {
    const now = ts ? new Date(ts) : new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

// 格式化消息时间 (显示在聊天中)
function formatMessageTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// HTML转义，防止XSS
function escapeHtml(u) {
    return u ? u.replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\n/g, "<br>") 
             : '';
}

// 清理AI回复中的 <think> 标签（用于深度思考模型）
function cleanAiResponse(raw) {
    return (raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()) || "";
}

// Data URL 转 Blob 对象
function dataURLtoBlob(dataUrl) {
    const arr = dataUrl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

// 图片压缩
function compressImage(file, maxSize = 128) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 动态加载 JSZip 库 (用于备份/恢复)
let jszipPromise = null;
function loadJSZip() {
    if (window.JSZip) { return Promise.resolve() }
    if (jszipPromise) { return jszipPromise }
    jszipPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        script.onload = () => { resolve() };
        script.onerror = () => {
            jszipPromise = null;
            logToUI('备份/恢复功能所需组件加载失败，请检查网络连接后重试。');
            reject(new Error('备份/恢复功能所需组件加载失败，请检查网络连接后重试。'))
        };
        document.head.appendChild(script)
    });
    return jszipPromise
}

// Blob 转 Data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e.target.error);
        reader.readAsDataURL(blob)
    })
}

// UI 日志记录
function logToUI(message) {
    const timestamp = new Date().toLocaleTimeString('en-GB');
    const logEntry = `[${timestamp}] ${message}`;
    
    // 确保 appData.logs 存在 (appData 将在 app.js 中定义，这里需要做个防卫)
    if (typeof appData !== 'undefined' && appData.logs) {
        appData.logs.push(logEntry);
    }
    console.log(message);
}

// 通用 Fetch 请求（带重试机制）
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            // 增加对响应内容的有效性检查
            if (!data.choices || data.choices.length === 0 || !data.choices[0].message?.content) {
                throw new Error('Invalid response content (e.g., empty choices or content).');
            }
            return data; // 直接返回解析后的有效数据
        } catch (error) {
            logToUI(`Attempt ${attempt} of ${retries} failed: ${error.message}`);
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error('AllRetryAttemptsFailed');
            }
        }
    }
}
