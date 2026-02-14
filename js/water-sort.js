/* =========================================================================
   倒水排序 — 60关
   反向打乱法 + 每瓶必满 + DFS生成验证
   ========================================================================= */
(function () {
    'use strict';

    const CAP = 4;
    const TOTAL_LEVELS = 60;
    const STORAGE_KEY = 'waterSort_v9';

    const LEVEL_TABLE = [
        [ 2, 3,  4, 1],
        [ 4, 3,  5, 1],
        [ 6, 3,  6, 1],
        [ 8, 3,  7, 1],
        [10, 3,  8, 1],
        [15, 4,  8, 1],
        [20, 4,  9, 1],
        [25, 5,  9, 1],
        [30, 5, 10, 1],
        [35, 6, 10, 2],
        [40, 6, 11, 2],
        [45, 7, 11, 2],
        [50, 7, 12, 2],
        [55, 8, 12, 2],
        [60, 8, 13, 2],
    ];

    function getLevelConfig(level) {
        for (const [maxLv, cc, tb, eb] of LEVEL_TABLE) {
            if (level <= maxLv) return { colorCount: cc, totalBottles: tb, emptyBottles: eb };
        }
        return { colorCount: 8, totalBottles: 13, emptyBottles: 2 };
    }

    const S = {
        level: 1, bottles: [], sel: null, moves: 0,
        history: [], maxLevel: 1, busy: false, hintTimer: null
    };

    const $ = {};
    function cacheDom() {
        'bottlesContainer moveCount colorInfo bottleInfo levelBadge undoBtn restartBtn hintBtn levelSelectBtn levelSelectOverlay levelGrid levelCloseBtn winOverlay winSubtitle winStars winReplayBtn winNextBtn gameBackBtn loadingOverlay'
            .split(' ').forEach(id => $[id] = document.getElementById(id));
    }

    function load() {
        try {
            const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (d) { S.maxLevel = d.m || 1; S.level = d.l || 1; }
        } catch (e) { }
    }
    function save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ m: S.maxLevel, l: S.level }));
    }

    function makeRng(seed) {
        let s = (seed >>> 0) || 1;
        return function () {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5;
            return (s >>> 0) / 4294967296;
        };
    }

    function topN(b) {
        if (!b.length) return 0;
        const c = b[b.length - 1]; let n = 0;
        for (let i = b.length - 1; i >= 0; i--) { if (b[i] === c) n++; else break; }
        return n;
    }
    function isFull(b) { return b.length === CAP && new Set(b).size === 1; }
    function isWin(bs) {
        for (const b of bs) {
            if (!b.length) continue;
            if (b.length !== CAP || new Set(b).size !== 1) return false;
        }
        return true;
    }
    function canPour(bs, f, t) {
        if (f === t) return false;
        const fr = bs[f], to = bs[t];
        if (!fr.length || to.length >= CAP) return false;
        return !to.length || fr[fr.length - 1] === to[to.length - 1];
    }

    function distributeColors(colorCount, filledBottles) {
        const base = Math.floor(filledBottles / colorCount);
        const rem = filledBottles % colorCount;
        const dist = [];
        for (let i = 0; i < colorCount; i++) {
            dist.push(i < rem ? base + 1 : base);
        }
        return dist;
    }

    /* ============ DFS 求解器 ============ */
    function solve(bottles, budget) {
        budget = budget || 250000;
        const n = bottles.length;
        const visited = new Set();
        let nodes = 0;

        function stateKey(bs) {
            const strs = new Array(n);
            for (let i = 0; i < n; i++) strs[i] = bs[i].join('');
            strs.sort();
            return strs.join('|');
        }

        function dfs(bs, path, depth) {
            if (++nodes > budget) return null;
            if (isWin(bs)) return path.slice();
            if (depth > n * CAP + 5) return null;
            const k = stateKey(bs);
            if (visited.has(k)) return null;
            visited.add(k);

            const ops = [];
            for (let i = 0; i < n; i++) {
                const bi = bs[i];
                if (!bi.length || isFull(bi)) continue;
                const iTop = bi[bi.length - 1];
                const iTopN = topN(bi);
                const iColors = new Set(bi).size;
                for (let j = 0; j < n; j++) {
                    if (i === j) continue;
                    const bj = bs[j];
                    if (bj.length >= CAP) continue;
                    if (bj.length === 0) {
                        if (iColors === 1) continue;
                        if (iTopN === bi.length) continue;
                        ops.push({ i, j, pri: 1 });
                    } else if (bj[bj.length - 1] === iTop) {
                        const av = CAP - bj.length;
                        const cnt = Math.min(iTopN, av);
                        if (bj.length + cnt === CAP && new Set(bj).size === 1) ops.push({ i, j, pri: 6 });
                        else if (cnt === bi.length) ops.push({ i, j, pri: 4 });
                        else ops.push({ i, j, pri: 3 });
                    }
                }
            }
            ops.sort((a, b) => b.pri - a.pri);

            for (const op of ops) {
                const nb = bs.map(b => b.slice());
                const cnt = Math.min(topN(nb[op.i]), CAP - nb[op.j].length);
                for (let k = 0; k < cnt; k++) nb[op.j].push(nb[op.i].pop());
                path.push({ from: op.i, to: op.j });
                const r = dfs(nb, path, depth + 1);
                if (r) return r;
                path.pop();
            }
            return null;
        }

        return dfs(bottles.map(b => b.slice()), [], 0);
    }

    /* ============ 关卡生成 — 反向打乱 + 收集重装 ============ */
    function generateLevel(level) {
        const cfg = getLevelConfig(level);
        const { colorCount, totalBottles, emptyBottles } = cfg;
        const filled = totalBottles - emptyBottles;
        const dist = distributeColors(colorCount, filled);
        const totalBlocks = filled * CAP;
        const baseSeed = level * 2654435761 + 54321;
        let bestBs = null, bestMix = 0;

        for (let attempt = 0; attempt < 150; attempt++) {
            const r = makeRng(baseSeed + attempt * 31337);

            // 1. 完成状态
            const temp = [];
            for (let c = 0; c < colorCount; c++) {
                for (let j = 0; j < dist[c]; j++) temp.push([c, c, c, c]);
            }
            for (let i = 0; i < emptyBottles; i++) temp.push([]);

            // 2. 反向打乱
            const n = temp.length;
            const steps = filled * 25 + Math.floor(r() * filled * 15);
            for (let s = 0; s < steps; s++) {
                const f = Math.floor(r() * n);
                const t = Math.floor(r() * n);
                if (f === t || !temp[f].length || temp[t].length >= CAP) continue;
                const maxCnt = Math.min(temp[f].length, CAP - temp[t].length);
                const cnt = 1 + Math.floor(r() * maxCnt);
                for (let k = 0; k < cnt; k++) temp[t].push(temp[f].pop());
            }

            // 3. 收集所有液体块
            const allBlocks = [];
            for (const b of temp) for (const c of b) allBlocks.push(c);
            if (allBlocks.length !== totalBlocks) continue;

            // 4. 每4个一组装回（保证满/空）
            const bottles = [];
            for (let i = 0; i < filled; i++) {
                bottles.push(allBlocks.slice(i * CAP, (i + 1) * CAP));
            }
            for (let i = 0; i < emptyBottles; i++) bottles.push([]);

            // 5. 质量检查
            if (isWin(bottles)) continue;
            let hasCompleted = false;
            for (const b of bottles) {
                if (b.length === CAP && new Set(b).size === 1) { hasCompleted = true; break; }
            }
            if (hasCompleted) continue;

            let mixed = 0;
            for (const b of bottles) {
                if (b.length > 0 && new Set(b).size >= 2) mixed++;
            }
            if (mixed < Math.ceil(filled * 0.4)) continue;

            // 6. DFS 验证
            const sol = solve(bottles, 300000);
            if (sol && sol.length >= 2) {
                if (mixed > bestMix) {
                    bestMix = mixed;
                    bestBs = bottles;
                    if (mixed >= Math.ceil(filled * 0.6)) return bottles;
                }
            }
        }

        if (bestBs) return bestBs;

        const bs = [];
        for (let c = 0; c < colorCount; c++) {
            for (let j = 0; j < dist[c]; j++) bs.push([c, c, c, c]);
        }
        for (let i = 0; i < emptyBottles; i++) bs.push([]);
        return bs;
    }

    /* ============ SVG ============ */
    function createBottleSVG() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 56 152');
        svg.setAttribute('class', 'bottle-svg');
        svg.setAttribute('fill', 'none');
        svg.innerHTML =
            '<path d="M 8 20 L 8 118 Q 8 146 28 146 Q 48 146 48 118 L 48 20" fill="url(#gG)" stroke="rgba(120,170,255,0.28)" stroke-width="1.5"/>' +
            '<path d="M 10 20 L 10 117 Q 10 143 28 143 Q 46 143 46 117 L 46 20" fill="url(#gI)"/>' +
            '<ellipse cx="28" cy="20" rx="21" ry="5.5" fill="rgba(60,100,180,0.06)" stroke="url(#gR)" stroke-width="2.2"/>' +
            '<ellipse cx="28" cy="19.5" rx="16" ry="3.5" fill="none" stroke="rgba(200,230,255,0.10)" stroke-width="0.8"/>' +
            '<path d="M 12.5 25 L 12.5 116 Q 13.5 138 23 143" stroke="rgba(180,220,255,0.35)" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M 17 29 L 17 112 Q 18 132 24 138" stroke="rgba(210,240,255,0.10)" stroke-width="1.2" stroke-linecap="round"/>' +
            '<path d="M 43.5 30 L 43.5 110 Q 42.5 130 36 138" stroke="rgba(160,200,255,0.08)" stroke-width="1.5" stroke-linecap="round"/>' +
            '<ellipse cx="28" cy="142" rx="10" ry="2.5" fill="url(#gB)"/>';
        return svg;
    }

    /* ============ 渲染 ============ */
    function render() {
        $.bottlesContainer.innerHTML = '';
        const n = S.bottles.length;
        $.bottlesContainer.className = 'bottles-container';
        if (n >= 12) $.bottlesContainer.classList.add('size-s');
        else if (n >= 9) $.bottlesContainer.classList.add('size-m');

        S.bottles.forEach((bottle, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'bottle-wrapper';
            if (S.sel === idx) wrap.classList.add('selected');
            if (isFull(bottle)) wrap.classList.add('completed');

            const outer = document.createElement('div');
            outer.className = 'bottle-outer';
            const liq = document.createElement('div');
            liq.className = 'bottle-liquid-area';
            for (let i = 0; i < bottle.length; i++) {
                const layer = document.createElement('div');
                layer.className = 'liquid-layer liquid-' + bottle[i];
                liq.appendChild(layer);
            }
            outer.appendChild(liq);
            outer.appendChild(createBottleSVG());
            wrap.appendChild(outer);
            wrap.addEventListener('click', () => onClick(idx));
            $.bottlesContainer.appendChild(wrap);
        });
    }

    function updateUI() {
        const cfg = getLevelConfig(S.level);
        $.moveCount.textContent = S.moves;
        $.colorInfo.textContent = cfg.colorCount;
        $.bottleInfo.textContent = cfg.totalBottles;
        $.levelBadge.textContent = '第 ' + S.level + ' 关';
        $.undoBtn.disabled = !S.history.length;
    }

    /* ============ 交互 ============ */
    function onClick(idx) {
        if (S.busy) return;
        clearHint();
        if (S.sel === null) {
            if (!S.bottles[idx].length || isFull(S.bottles[idx])) return;
            S.sel = idx; render();
        } else if (S.sel === idx) {
            S.sel = null; render();
        } else {
            if (canPour(S.bottles, S.sel, idx)) {
                execPour(S.sel, idx);
            } else {
                S.sel = (S.bottles[idx].length && !isFull(S.bottles[idx])) ? idx : null;
                render();
            }
        }
    }

    function execPour(f, t) {
        S.busy = true;
        const fr = S.bottles[f], to = S.bottles[t];
        const cnt = Math.min(topN(fr), CAP - to.length);
        S.history.push({ f, t, cnt });
        for (let i = 0; i < cnt; i++) to.push(fr.pop());
        S.moves++; S.sel = null;
        render(); updateUI();

        if (isFull(S.bottles[t])) {
            const ws = $.bottlesContainer.querySelectorAll('.bottle-wrapper');
            if (ws[t]) ws[t].classList.add('just-completed');
        }
        setTimeout(() => {
            S.busy = false;
            if (isWin(S.bottles)) setTimeout(onWin, 250);
        }, 350);
    }

    function undo() {
        if (!S.history.length || S.busy) return;
        const h = S.history.pop();
        for (let i = 0; i < h.cnt; i++) S.bottles[h.f].push(S.bottles[h.t].pop());
        S.moves--; S.sel = null;
        render(); updateUI();
    }

    /* ============ 提示 ============ */
    function showHint() {
        if (S.busy) return;
        clearHint();
        const sol = solve(S.bottles, 150000);
        if (!sol || !sol.length) return;
        S.sel = null; render();
        const ws = $.bottlesContainer.querySelectorAll('.bottle-wrapper');
        if (ws[sol[0].from]) ws[sol[0].from].classList.add('hint-source');
        S.hintTimer = setTimeout(clearHint, 3000);
    }
    function clearHint() {
        if (S.hintTimer) { clearTimeout(S.hintTimer); S.hintTimer = null; }
        $.bottlesContainer.querySelectorAll('.hint-source').forEach(e => e.classList.remove('hint-source'));
    }

    /* ============ 关卡管理 ============ */
    function startLevel(lv) {
        $.loadingOverlay.classList.remove('hidden');
        setTimeout(() => {
            S.level = lv;
            S.bottles = generateLevel(lv);
            S.sel = null; S.moves = 0;
            S.history = []; S.busy = false;
            render(); updateUI(); save();
            $.loadingOverlay.classList.add('hidden');
        }, 80);
    }

    function onWin() {
        if (S.level >= S.maxLevel) S.maxLevel = Math.min(S.level + 1, TOTAL_LEVELS);
        save();
        const cfg = getLevelConfig(S.level);
        const base = cfg.totalBottles * 2;
        const stars = S.moves <= base ? 3 : S.moves <= Math.floor(base * 1.8) ? 2 : 1;
        $.winStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        $.winSubtitle.textContent = '用了 ' + S.moves + ' 步完成';
        $.winOverlay.classList.add('show');
        $.winNextBtn.textContent = S.level >= TOTAL_LEVELS ? '🏆 全部通关！' : '下一关 ▶';
        $.winNextBtn.disabled = S.level >= TOTAL_LEVELS;
    }

    /* ============ 关卡选择 ============ */
    function showLevels() {
        $.levelGrid.innerHTML = '';
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            const c = getLevelConfig(i);
            btn.innerHTML = i + '<span class="level-info">' + c.colorCount + '色' + c.totalBottles + '瓶</span>';
            if (i < S.maxLevel) btn.classList.add('completed');
            else if (i === S.level) btn.classList.add('current');
            else if (i > S.maxLevel) btn.classList.add('locked');
            if (i <= S.maxLevel) {
                btn.addEventListener('click', () => {
                    $.levelSelectOverlay.classList.remove('show');
                    startLevel(i);
                });
            }
            $.levelGrid.appendChild(btn);
        }
        $.levelSelectOverlay.classList.add('show');
    }

    /* ============ 事件 ============ */
    function bindEvents() {
        $.undoBtn.addEventListener('click', undo);
        $.restartBtn.addEventListener('click', () => startLevel(S.level));
        $.hintBtn.addEventListener('click', showHint);
        $.levelSelectBtn.addEventListener('click', showLevels);
        $.levelBadge.addEventListener('click', showLevels);
        $.levelCloseBtn.addEventListener('click', () => $.levelSelectOverlay.classList.remove('show'));
        $.winReplayBtn.addEventListener('click', () => { $.winOverlay.classList.remove('show'); startLevel(S.level); });
        $.winNextBtn.addEventListener('click', () => { $.winOverlay.classList.remove('show'); if (S.level < TOTAL_LEVELS) startLevel(S.level + 1); });
        $.gameBackBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
        $.levelSelectOverlay.addEventListener('click', e => { if (e.target === $.levelSelectOverlay) $.levelSelectOverlay.classList.remove('show'); });
    }

    cacheDom(); load(); bindEvents(); startLevel(S.level);
})();
