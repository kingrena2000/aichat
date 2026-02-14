/*=========================================================================海龟汤 —纯前端横向思维推理游戏
   联网优先加载JSON完整题库 / 离线回退内置精选题库
   ========================================================================= */
(function () {
    'use strict';

    const STORAGE_KEY = 'turtleSoup_v2';
    const DATA_URL = 'data/puzzles.json';

    /* ================================================================
       内置精选题库（离线兜底，10道经典题）
       ================================================================ */
    const BUILTIN_PUZZLES = [{
    "id": 1,
    "title": "海龟汤",
    "difficulty": 1,
    "category": "经典",
    "surface": "一个男人走进一家海边餐厅，点了一碗海龟汤。他喝了一口，然后走到外面，跳崖自杀了。为什么？",
    "truth": "多年前，这个男人和妻子在海上遭遇了船难，漂流到一座荒岛上。妻子因伤重而死。为了活下去，同行的伙伴把妻子的肉做成汤，骗他说是海龟汤。如今他在餐厅喝到了真正的海龟汤，发现味道完全不同，终于明白了当年喝的是妻子的肉，于是绝望自杀。",
    "hints": ["他以前喝过「海龟汤」","他发现今天的汤和以前的味道不一样","他曾经遭遇海难","当年有人骗了他","他当年喝的不是真的海龟汤"],
    "keyElements": ["海难", "妻子", "人肉", "味道不同", "被骗"],
    "qa": [
      { "k": ["男", "性别"], "a": "yes", "r": "是的，主角是男性。" },
      { "k": ["死", "自杀"], "a": "yes", "r": "是的，他最终自杀了。" },
      { "k": ["汤", "难喝", "味道不好", "不好喝"], "a": "no", "r": "不，汤本身没有问题，味道正常。" },
      { "k": ["汤", "有毒", "毒", "下毒"], "a": "no", "r": "不，汤里没有毒。" },
      { "k": ["汤", "味道", "不同", "不一样"], "a": "yes", "r": "是的！他发现这碗汤的味道和他记忆中的不一样。" },
      { "k": ["以前", "喝过", "之前", "曾经"], "a": "yes", "r": "是的，他以前喝过所谓的「海龟汤」。" },
      { "k": ["海难", "船难", "沉船", "遇难", "荒岛"], "a": "yes", "r": "是的！他曾经遭遇过海难。" },
      { "k": ["妻子", "老婆", "爱人", "女人"], "a": "yes", "r": "是的，和他的妻子有关。" },
      { "k": ["人肉", "吃人", "尸体", "肉"], "a": "yes", "r": "是的！这是关键——他当年喝的是人肉做的汤。" },
      { "k": ["骗", "谎", "欺骗"], "a": "yes", "r": "是的，有人骗他说那是海龟汤。" },
      { "k": ["餐厅", "饭店", "餐馆", "服务员"], "a": "irrelevant", "r": "餐厅本身没什么特别的，就是普通餐厅。" },
      { "k": ["知道", "发现", "明白", "真相", "意识到"], "a": "yes", "r": "是的，他在那一刻明白了真相。" }
    ]
  },
  {
    "id": 2,
    "title": "关灯",
    "difficulty": 1,
    "category": "经典",
    "surface": "一个女人关了灯就去睡觉了。第二天早上醒来看了新闻，她崩溃地哭了起来。为什么？",
    "truth": "女人是灯塔的管理员。她关的是灯塔的灯。因为灯塔的灯灭了，一艘船在夜晚迷失方向撞上礁石沉没，船上多人遇难。她在新闻上看到了这个消息。",
    "hints": ["她关的不是家里的灯","她的工作和灯有关","有人因为她关灯而受到伤害","和大海有关","她是灯塔管理员"],
    "keyElements": ["灯塔", "船", "沉没", "遇难"],
    "qa": [
      { "k": ["家", "房间", "卧室", "家里"], "a": "no", "r": "不，她关的不是家里的灯。" },
      { "k": ["灯塔"], "a": "yes", "r": "是的！她关的是灯塔的灯！" },
      { "k": ["工作", "职业", "职务"], "a": "yes", "r": "是的，和她的工作有关。她的工作是管灯。" },
      { "k": ["死", "死亡", "遇难", "去世"], "a": "yes", "r": "是的，有人因此死亡了。" },
      { "k": ["船", "航行", "航海", "轮船"], "a": "yes", "r": "是的！有船因此出了事。" },
      { "k": ["沉", "撞", "礁石", "触礁", "沉没"], "a": "yes", "r": "是的，船撞上了礁石沉没了。" },
      { "k": ["故意", "蓄意"], "a": "no", "r": "不，她不是故意的。" },
      { "k": ["海", "大海", "海边", "海上"], "a": "yes", "r": "是的，和大海有关。" }
    ]
  },
  {
    "id": 3,
    "title": "音乐停了",
    "difficulty": 1,
    "category": "经典",
    "surface": "音乐停了，她就死了。为什么？",
    "truth": "她是一个马戏团的走钢丝表演者，她是个盲人。音乐是她判断自己走到钢丝哪个位置的唯一依据。音乐突然停了，她无法判断位置，失去平衡从高空坠落而死。",
    "hints": ["她在一个危险的地方","音乐对她有特殊的重要性","她有身体上的缺陷","她在表演","她看不见"],
    "keyElements": ["走钢丝", "盲人", "高空", "坠落"],
    "qa": [
      { "k": ["自杀", "故意"], "a": "no", "r": "不，不是自杀，是意外。" },
      { "k": ["摔", "坠落", "掉", "跌"], "a": "yes", "r": "是的！她从高处坠落了。" },
      { "k": ["高", "高空", "高处"], "a": "yes", "r": "是的，她在一个很高的地方。" },
      { "k": ["钢丝", "绳索", "走钢丝", "钢索"], "a": "yes", "r": "是的！她在走钢丝！" },
      { "k": ["表演", "演出", "马戏", "杂技"], "a": "yes", "r": "是的，她在进行马戏表演。" },
      { "k": ["盲", "看不见", "瞎", "眼睛", "视力"], "a": "yes", "r": "是的！她是盲人，这是关键。" },
      { "k": ["音乐", "声音", "节奏", "听"], "a": "yes", "r": "是的，音乐是她判断位置的方式。" },
      { "k": ["位置", "方向", "平衡"], "a": "yes", "r": "是的，音乐帮她判断位置和保持平衡。" }
    ]
  },
  {
    "id": 6,
    "title": "电梯",
    "difficulty": 1,
    "category": "经典",
    "surface": "一个男人住在30楼。每天他出门上班时坐电梯直接到1楼。但他下班回家时，只坐电梯到25楼，然后走楼梯上去。下雨天他才会直接坐电梯到30楼。为什么？",
    "truth": "因为他是个矮个子（侏儒），只能够到25楼的按钮。下雨天他带伞，可以用伞尖按到30楼的按钮。",
    "hints": ["和他的身体特征有关","他没办法按到30楼的按钮","下雨天他会带一样东西","他可以借助工具按到高处的按钮"],
    "keyElements": ["矮", "按钮", "够不到", "伞"],
    "qa": [
      { "k": ["矮", "个子", "身高", "侏儒", "小矮人", "很矮"], "a": "yes", "r": "是的！他是个矮个子，这是关键！" },
      { "k": ["按钮", "按不到", "够不到", "够不着"], "a": "yes", "r": "是的！他够不到30楼的按钮。" },
      { "k": ["伞", "雨伞"], "a": "yes", "r": "是的！下雨天他带伞，可以用伞按到高楼层按钮。" },
      { "k": ["锻炼", "运动", "减肥", "健身"], "a": "no", "r": "不，不是为了锻炼。" },
      { "k": ["怕", "恐惧", "恐高"], "a": "no", "r": "不，他不恐高。" },
      { "k": ["坏", "故障", "维修", "电梯坏"], "a": "no", "r": "不，电梯没有故障。" },
      { "k": ["喜欢", "想", "愿意"], "a": "no", "r": "不，他并不想走楼梯，是不得已的。" }
    ]
  },
  {
    "id": 12,
    "title": "空房间",
    "difficulty": 3,
    "category": "推理",
    "surface": "一个密封的房间里，地上有一滩水和碎玻璃，旁边躺着一个死去的Tom。Tom是怎么死的？",
    "truth": "Tom是一条金鱼。鱼缸从桌上掉下来摔碎了，水流了一地，Tom因为离开水而死。",
    "hints": ["Tom不一定是人类","碎玻璃是某个容器碎了","水和Tom的死直接相关","Tom需要水才能活"],
    "keyElements": ["金鱼", "鱼缸", "碎了"],
    "qa": [
      { "k": ["人", "人类", "男人", "女人"], "a": "no", "r": "不，Tom不是人类。" },
      { "k": ["鱼", "金鱼", "动物", "宠物"], "a": "yes", "r": "是的！Tom是一条金鱼！" },
      { "k": ["鱼缸", "水缸", "缸", "容器"], "a": "yes", "r": "是的！碎玻璃是鱼缸碎了。" },
      { "k": ["摔", "掉", "打碎", "破"], "a": "yes", "r": "是的，鱼缸掉下来摔碎了。" },
      { "k": ["窒息", "缺氧", "缺水", "离开水"], "a": "yes", "r": "是的，鱼离开水就会死。" },
      { "k": ["谋杀", "杀", "凶手"], "a": "no", "r": "不，没有凶手，这是意外。" },
      { "k": ["密室", "密封", "门窗", "锁"], "a": "irrelevant", "r": "密封的房间是干扰信息，让你以为是密室杀人案。" }
    ]
  },
  {
    "id": 34,
    "title": "急诊室",
    "difficulty": 3,
    "category": "推理",
    "surface": "一个男孩被送到急诊室。外科医生看到他后说：「我没法给他动手术，他是我儿子。」但外科医生不是男孩的父亲。为什么？",
    "truth": "外科医生是男孩的母亲。我们习惯性地认为外科医生是男性，但外科医生是女性——男孩的妈妈。",
    "hints": ["外科医生和男孩有血缘关系","不要做性别假设","「他是我儿子」是字面意思","医生确实是男孩的亲生家长"],
    "keyElements": ["母亲", "女性", "妈妈"],
    "qa": [
      { "k": ["母亲", "妈妈", "女", "女性", "女人"], "a": "yes", "r": "是的！外科医生是男孩的母亲！" },
      { "k": ["继父", "养父", "后爸"], "a": "no", "r": "不，不涉及继父。" },
      { "k": ["亲生", "血缘", "亲人"], "a": "yes", "r": "是的，医生和男孩有直接的血缘关系。" },
      { "k": ["性别", "男女", "偏见"], "a": "yes", "r": "是的！这道题考的就是性别偏见——我们默认医生是男性。" },
      { "k": ["父亲", "爸爸", "两个爸爸"], "a": "no", "r": "不，答案更简单，不需要两个父亲。" }
    ]
  },
  {
    "id": 39,
    "title": "录音笔",
    "difficulty": 3,
    "category": "推理",
    "surface": "警方在一个自杀者身边找到了一支录音笔。按下播放后听到：「我实在活不下去了……」然后是一声枪响。警方立刻判定这不是自杀。为什么？",
    "truth": "如果是自杀，他开枪后就死了，不可能再按下录音笔的停止键。但录音在枪响后就停了——这意味着有人在开枪后帮他关掉了录音。所以现场还有第二个人存在，这是谋杀伪装成自杀。",
    "hints": ["录音是怎么停下来的？","死人能操作录音笔吗？","现场还有第二个人","有人在开枪后做了操作"],
    "keyElements": ["停止键", "死后不能操作", "第二个人", "谋杀"],
    "qa": [
      { "k": ["停止", "关掉", "停", "按停"], "a": "yes", "r": "是的！关键是谁按的停止键。" },
      { "k": ["死", "死了", "不能操作", "不可能"], "a": "yes", "r": "是的！死人不可能关掉录音笔。" },
      { "k": ["第二个人", "别人", "有人", "其他人"], "a": "yes", "r": "是的！现场一定还有第二个人。" },
      { "k": ["谋杀", "杀", "他杀", "伪装"], "a": "yes", "r": "是的！这是谋杀伪装成自杀。" },
      { "k": ["录音", "继续", "没停", "一直录"], "a": "no", "r": "不，录音在枪响后就停了，这正是破绽。" },
      { "k": ["枪", "开枪", "枪响"], "a": "yes", "r": "是的，枪响后人就死了，不可能再操作任何设备。" }
    ]
  },
  {
    "id": 40,
    "title": "玻璃杯",
    "difficulty": 1,
    "category": "经典",
    "surface": "一个魔术师说他能把一杯水扔到3米外，水一滴不洒地原样接住。他做到了。怎么做到的？",
    "truth": "他扔的是冰。他把水冻成冰块后扔到3米外接住，冰不会洒。题目说的是「一杯水」，但没说扔的时候水必须是液态的。",
    "hints": ["水不一定是液态的","他在扔之前做了什么处理","改变了水的状态","温度可以改变水"],
    "keyElements": ["冰", "冻", "固态"],
    "qa": [
      { "k": ["冰", "冻", "结冰", "冰块"], "a": "yes", "r": "是的！他把水冻成了冰！" },
      { "k": ["液态", "液体", "水的状态"], "a": "yes", "r": "关键就在于水不是液态的。" },
      { "k": ["杯子", "盖着", "封住"], "a": "no", "r": "不，没有用盖子封住杯子。" },
      { "k": ["魔术", "手法", "障眼法"], "a": "no", "r": "不，不是传统的魔术手法，是巧妙利用物理。" },
      { "k": ["温度", "冷", "冰箱", "冷冻"], "a": "yes", "r": "是的，和温度有关。" }
    ]
  },
  {
    "id": 5,
    "title": "照片",
    "difficulty": 2,
    "category": "经典",
    "surface": "一个男人看着一张照片说：「我没有兄弟姐妹，但这个人的父亲是我父亲的儿子。」照片上是谁？",
    "truth": "照片上是他的儿子。「我父亲的儿子」就是他自己（因为他没有兄弟姐妹），所以「这个人的父亲」就是他本人，照片上是他的儿子。",
    "hints": ["仔细分析「我父亲的儿子」是谁","他没有兄弟姐妹这个条件很关键","我父亲的儿子 = ？","照片上不是他自己"],
    "keyElements": ["儿子"],
    "qa": [
      { "k": ["自己", "本人", "他自己"], "a": "no", "r": "不，照片上不是他自己。" },
      { "k": ["父亲", "爸爸"], "a": "no", "r": "不，照片上不是他父亲。" },
      { "k": ["儿子", "孩子", "小孩"], "a": "yes", "r": "是的！照片上是他的儿子！" },
      { "k": ["女儿"], "a": "no", "r": "不，不是女儿。题目说的是「这个人的父亲」。" },
      { "k": ["侄子", "外甥", "表"], "a": "no", "r": "不，他没有兄弟姐妹，不会有侄子。" },
      { "k": ["逻辑", "绕口", "文字游戏"], "a": "yes", "r": "是的，这是一道逻辑推理题。" }
    ]
  },
  {
    "id": 33,
    "title": "雨中奔跑",
    "difficulty": 1,
    "category": "经典",
    "surface": "两个人在雨中，一个人拼命跑，一个人慢慢走。结果跑的人浑身湿透了，走的人却没湿。为什么？",
    "truth": "走的人穿着雨衣或打着伞。跑的人什么都没带。题目没说走的人没有雨具——我们习惯性地认为两个人条件相同，但其实不是。",
    "hints": ["两个人的装备不一样","走的人有准备","不要假设两个人条件相同","和雨具有关"],
    "keyElements": ["雨衣", "伞", "雨具"],
    "qa": [
      { "k": ["伞", "雨伞", "打伞"], "a": "yes", "r": "是的！走的人可能打着伞。" },
      { "k": ["雨衣", "雨具", "防雨"], "a": "yes", "r": "是的！走的人有雨具。" },
      { "k": ["遮挡", "建筑", "屋檐"], "a": "no", "r": "不，不是靠建筑物遮挡。" },
      { "k": ["车", "汽车", "开车"], "a": "no", "r": "不，走的人确实在走路。" },
      { "k": ["条件", "一样", "相同"], "a": "no", "r": "不！两个人的条件并不相同，这就是关键。" }
    ]
  }
];/* ============ 状态 ============ */
    const S = {
        puzzles: [],
        current: 0,
        solved: {},
        maxUnlocked: 1,
        hintsUsed: 0,
        chatLog: [],
        answerMode: false,
        storyCollapsed: false,
        isOnline: false
    };

    /* ============ DOM============ */
    const $ = {};
    function cacheDom() {
        'storyCard storyTitle storyText metaDiff metaCat metaNum hintBtn hintCount answerModeBtn chatArea inputField sendBtn inputMode listOverlay puzzleList listClose backBtn listBtn loading inputArea'.split(' ').forEach(id => $[id] = document.getElementById(id));
    }

    /* ============ 存档 ============ */
    function loadProgress() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (d) {
                S.solved = d.s || {};
                S.maxUnlocked = d.m || 1;
                S.current = d.c || 0;}
        } catch (e) { }
    }
    function saveProgress() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            s: S.solved, m: S.maxUnlocked, c: S.current
        }));
    }

    /* ============================================================题库加载 — 联网优先 / 离线回退
       1. 尝试 fetch JSON（加3秒超时）
       2. 成功 → 用完整50题，显示「在线·50题」
       3. 失败 → 用内置10题，显示「离线·10题」
       ============================================================ */
    async function loadPuzzles() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(DATA_URL, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) throw new Error('HTTP ' + res.status);

            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                S.puzzles = data;
                S.isOnline = true;
                console.log('✅ 在线题库加载成功：' + data.length + ' 题');
                return;
            }
            throw new Error('数据为空');
        } catch (e) {
            console.warn('⚠️ 在线题库加载失败，使用内置题库：', e.message);
            S.puzzles = BUILTIN_PUZZLES;
            S.isOnline = false;
        }
    }

    /* ============ 初始化题目 ============ */
    function loadPuzzle(index) {
        if (index < 0 || index >= S.puzzles.length) return;
        S.current = index;
        S.hintsUsed = 0;
        S.chatLog = [];
        S.answerMode = false;
        S.storyCollapsed = false;
        saveProgress();
        renderStory();
        renderChat();
        updateHintBar();
        updateInputMode();
    }

    /* ============ 渲染汤面============ */
    function renderStory() {
        const p = S.puzzles[S.current];
        if (!p) return;
        $.storyTitle.textContent = p.title;
        $.storyText.textContent = p.surface;
        $.metaDiff.textContent = '⭐'.repeat(p.difficulty) + ' 难度';
        $.metaCat.textContent = '📂' + p.category;

        const src = S.isOnline ? '🌐' : '📦';
        $.metaNum.textContent = src + ' 第' + (S.current + 1) + '/' + S.puzzles.length + ' 题';

        $.storyCard.classList.remove('collapsed');
        $.storyCard.onclick = function () {
            S.storyCollapsed = !S.storyCollapsed;
            $.storyCard.classList.toggle('collapsed', S.storyCollapsed);
        };
    }

    /* ============ 提示栏 ============ */
    function updateHintBar() {
        const p = S.puzzles[S.current];
        if (!p) return;
        $.hintCount.textContent = S.hintsUsed + ' / ' + p.hints.length;
        $.hintBtn.disabled = S.hintsUsed >= p.hints.length;
    }

    /* ============ 输入模式切换 ============ */
    function updateInputMode() {
        if (S.answerMode) {
            $.inputField.placeholder = '输入你猜测的完整真相...';
            $.inputMode.innerHTML = '🎯<em>答案模式</em> — 说出你推理的完整故事';
            $.inputArea.classList.add('answer-mode');
            $.answerModeBtn.textContent = '❓ 返回提问';
        } else {
            $.inputField.placeholder = '输入你的问题...';
            $.inputMode.innerHTML = '提问模式 — 请用是非问句提问';
            $.inputArea.classList.remove('answer-mode');
            $.answerModeBtn.textContent = '🎯 提交答案';
        }
        $.inputField.focus();
    }

    /* ============ 聊天渲染 ============ */
    function renderChat() {
        $.chatArea.innerHTML = '';
        if (S.chatLog.length === 0) {
            $.chatArea.innerHTML =
                '<div class="chat-welcome">' +
                '<div class="cw-icon">🐢</div>' +
                '阅读上面的汤面<br>' +
                '然后用<strong>是/否问题</strong>来提问吧<br>' +
                '<span style="font-size:11px;opacity:0.6">例如：他是男的吗？/ 和天气有关吗？</span>' +
                '</div>';
            return;
        }
        S.chatLog.forEach(msg => $.chatArea.appendChild(createMsgEl(msg)));
        scrollToBottom();
    }

    function createMsgEl(msg) {
        if (msg.type === 'result') return createResultEl(msg);

        const div = document.createElement('div');
        div.className = 'msg ' + (msg.type === 'user' ? 'msg-user' : 'msg-bot') +
            (msg.hint ? ' msg-hint' : '');

        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.textContent = msg.type === 'user' ? '🤔' : '🐢';

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';

        if (msg.tag) {
            const tag = document.createElement('span');
            tag.className = 'answer-tag tag-' + msg.tag;
            tag.textContent = msg.tag === 'yes' ? '是' : msg.tag === 'no' ? '否' : '无关';
            bubble.appendChild(tag);
        }
        bubble.appendChild(document.createTextNode(msg.text));
        div.appendChild(avatar);
        div.appendChild(bubble);
        return div;
    }

    function createResultEl(msg) {
        const div = document.createElement('div');
        div.className = 'result-card ' + msg.grade;
        const p = S.puzzles[S.current];
        const labels = { success: '🎉 完全正确！', partial: '🤏 接近了！', fail: '😅 不太对哦' };

        div.innerHTML =
            '<div class="result-icon">' + (msg.grade === 'success' ? '🎉' : msg.grade === 'partial' ? '🤔' : '😅') + '</div>' +
            '<div class="result-title">' + labels[msg.grade] + '</div>' +
            '<div class="result-truth-label">🍲汤 底</div>' +
            '<div class="result-truth">' + p.truth + '</div>' +
            '<div class="result-actions">' +
            (msg.grade !== 'success' ? '<button class="result-btn result-btn-secondary" data-action="retry">🔄 再想想</button>' : '') +
            (S.current< S.puzzles.length - 1 ?
                '<button class="result-btn result-btn-primary" data-action="next">下一题 ▶</button>' :
                '<button class="result-btn result-btn-primary" data-action="list">📋 回到题库</button>') +
            '</div>';

        div.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const a = btn.dataset.action;
                if (a === 'retry') {
                    S.chatLog = S.chatLog.filter(m => m.type !== 'result');
                    S.answerMode = false;
                    updateInputMode(); renderChat();
                } else if (a === 'next') nextPuzzle();
                else if (a === 'list') showList();
            });
        });
        return div;
    }

    function addMsg(msg) {
        S.chatLog.push(msg);
        $.chatArea.appendChild(createMsgEl(msg));
        scrollToBottom();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => { $.chatArea.scrollTop = $.chatArea.scrollHeight; });
    }

    /* ============ 关键词匹配 ============ */
    function matchQuestion(question, puzzle) {
        const q = question.toLowerCase().replace(/[？?！!。，,.]/g, '');
        let bestMatch = null, bestScore = 0;
        for (const qa of puzzle.qa) {
            let score = 0;
            for (const kw of qa.k) {
                if (q.includes(kw.toLowerCase())) score += kw.length;
            }
            if (score > bestScore) { bestScore = score; bestMatch = qa; }
        }
        return (bestMatch && bestScore >=1) ? { answer: bestMatch.a, response: bestMatch.r } : null;
    }

    function getDefaultResponse() {
        const r = [
            '这个问题我无法直接回答，试试换个角度提问吧。',
            '嗯…这个不太好回答，再想想其他方向？',
            '这个和谜题关系不大，换个思路试试。',
            '我不确定你问的是什么，可以更具体一些吗？',
            '试着从关键细节入手提问吧。',
            '这个问题不太能用是或否回答，换个方式问问？'
        ];
        return r[Math.floor(Math.random() * r.length)];
    }

    /* ============ 发送 ============ */
    function handleSend() {
        const text = $.inputField.value.trim();
        if (!text) return;
        $.inputField.value = '';
        const p = S.puzzles[S.current];
        if (!p) return;
        S.answerMode ? handleAnswer(text, p) : handleQuestion(text, p);
    }

    function handleQuestion(text, puzzle) {
        if (!S.storyCollapsed && S.chatLog.length >= 2) {
            S.storyCollapsed = true;
            $.storyCard.classList.add('collapsed');
        }
        addMsg({ type: 'user', text: text });
        setTimeout(() => {
            const r = matchQuestion(text, puzzle);
            addMsg(r ? { type: 'bot', text: r.response, tag: r.answer } :{ type: 'bot', text: getDefaultResponse() });
        }, 300+ Math.random() * 400);
    }

    function handleAnswer(text, puzzle) {
        addMsg({ type: 'user', text: '【答案】' + text });
        setTimeout(() => {
            const grade = checkAnswer(text, puzzle);
            if (grade === 'success') {
                S.solved[puzzle.id] = true;
                if (S.current + 1 >= S.maxUnlocked)
                    S.maxUnlocked = Math.min(S.current + 2, S.puzzles.length);
                saveProgress();
            }
            S.chatLog.push({ type: 'result', grade });
            $.chatArea.appendChild(createResultEl({ type: 'result', grade }));
            scrollToBottom();
        }, 500);
    }

    function checkAnswer(text, puzzle) {
        const t = text.toLowerCase();
        let matched = 0;
        for (const el of puzzle.keyElements) {
            if (t.includes(el.toLowerCase())) matched++;
        }
        const ratio = matched / puzzle.keyElements.length;
        if (ratio >= 0.5) return 'success';
        if (ratio >= 0.25|| matched >=1) return 'partial';
        return 'fail';
    }

    /* ============ 提示 ============ */
    function showHint() {
        const p = S.puzzles[S.current];
        if (!p || S.hintsUsed >= p.hints.length) return;
        addMsg({ type: 'bot', text: '💡 提示：' + p.hints[S.hintsUsed], hint: true });
        S.hintsUsed++;
        updateHintBar();
    }

    function nextPuzzle() {
        if (S.current + 1 < S.puzzles.length) loadPuzzle(S.current + 1);
    }

    /* ============ 题目列表 ============ */
    function showList() {
        $.puzzleList.innerHTML = '';

        // 来源提示条
        const banner = document.createElement('div');
        banner.style.cssText = 'text-align:center;font-size:11px;padding:6px 0 12px;color:rgba(255,255,255,0.35)';
        banner.textContent = S.isOnline
            ? '🌐 在线题库 · ' + S.puzzles.length + ' 题'
            : '📦 离线精选 · ' + S.puzzles.length + ' 题（联网可解锁全部）';
        $.puzzleList.appendChild(banner);

        S.puzzles.forEach((p, i) => {
            const item = document.createElement('div');
            item.className = 'puzzle-item';
            const unlocked = i < S.maxUnlocked;
            const solved = S.solved[p.id];
            if (solved) item.classList.add('solved');
            if (!unlocked) item.classList.add('locked');

            item.innerHTML =
                '<div class="puzzle-num">' + (i + 1) + '</div>' +
                '<div class="puzzle-info">' +
                '<div class="puzzle-info-title">' + (unlocked ? p.title : '???') + '</div>' +
                '<div class="puzzle-info-meta">' + '⭐'.repeat(p.difficulty) + ' · ' + p.category + '</div>' +
                '</div>' +
                '<div class="puzzle-status">' + (solved ? '✅' : unlocked ? '' : '🔒') + '</div>';

            if (unlocked) {
                item.addEventListener('click', () => {
                    $.listOverlay.classList.remove('show');
                    loadPuzzle(i);
                });
            }
            $.puzzleList.appendChild(item);
        });
        $.listOverlay.classList.add('show');
    }

    /* ============ 事件 ============ */
    function bindEvents() {
        $.sendBtn.addEventListener('click', handleSend);
        $.inputField.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); handleSend(); }
        });
        $.hintBtn.addEventListener('click', showHint);
        $.answerModeBtn.addEventListener('click', () => {
            S.answerMode = !S.answerMode;
            updateInputMode();
        });
        $.listBtn.addEventListener('click', showList);
        $.listClose.addEventListener('click', () => $.listOverlay.classList.remove('show'));
        $.listOverlay.addEventListener('click', e => {
            if (e.target === $.listOverlay) $.listOverlay.classList.remove('show');
        });$.backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    }

    /* ============ 启动 ============ */
    async function init() {
        cacheDom();
        loadProgress();
        await loadPuzzles();
        bindEvents();
        if (S.current >= S.puzzles.length) S.current = 0;
        loadPuzzle(S.current);
        $.loading.classList.add('hidden');
    }

    init();
})();
