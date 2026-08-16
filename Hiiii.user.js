// ==UserScript==
// @name         Agma PC Auto Pickpocket
// @namespace    agma-auto-pick
// @version      1.0
// @description  Auto Pickpocket -> Steal Mass / Coins / SP
// @match        *://agma.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /* =========================
       SETTINGS
    ========================= */

    const COOLDOWN = {
        mass: 10 * 60 * 1000,
        coins: 20 * 60 * 1000,
        sp: 20 * 60 * 1000
    };

    const MENU_WAIT = 350;
    const ACTION_WAIT = 500;
    const TARGET_WAIT = 700;

    /* =========================
       STATE
    ========================= */

    let enabled = false;
    let target = null;
    let working = false;

    const cooldown = {
        mass: 0,
        coins: 0,
        sp: 0
    };

    /* =========================
       UI
    ========================= */

    function createUI() {
        const box = document.createElement('div');

        box.id = 'agmaAutoPickUI';

        box.style.cssText = `
            position:fixed;
            top:10px;
            left:10px;
            z-index:2147483647;
            background:rgba(20,20,20,.94);
            color:#fff;
            padding:10px;
            border-radius:12px;
            font-family:Arial,sans-serif;
            font-size:13px;
            min-width:180px;
            box-shadow:0 4px 20px rgba(0,0,0,.5);
        `;

        box.innerHTML = `
            <div style="font-weight:bold;font-size:15px;margin-bottom:7px">
                AGMA AUTO PICKPOCKET
            </div>

            <button id="agmaAutoToggle"
                style="
                    width:100%;
                    padding:7px;
                    border:0;
                    border-radius:7px;
                    background:#555;
                    color:white;
                    font-weight:bold;
                    cursor:pointer;
                ">
                OFF
            </button>

            <div id="agmaTargetStatus"
                style="margin-top:7px">
                Target: chưa chọn
            </div>

            <div id="agmaCooldownStatus"
                style="margin-top:5px;line-height:1.5">
                Mass: READY<br>
                Coins: READY<br>
                SP: READY
            </div>
        `;

        document.body.appendChild(box);

        document.getElementById('agmaAutoToggle')
            .addEventListener('click', toggle);

        updateUI();
    }

    function updateUI() {
        const targetEl =
            document.getElementById('agmaTargetStatus');

        const cdEl =
            document.getElementById('agmaCooldownStatus');

        const btn =
            document.getElementById('agmaAutoToggle');

        if (!targetEl || !cdEl || !btn) return;

        targetEl.textContent =
            target
                ? `Target: ${Math.round(target.x)}, ${Math.round(target.y)}`
                : 'Target: chưa chọn';

        if (enabled) {
            btn.textContent = 'ON';
            btn.style.background = '#16a34a';
        } else {
            btn.textContent = 'OFF';
            btn.style.background = '#555';
        }

        cdEl.innerHTML = `
            Mass: ${cooldownText(cooldown.mass)}<br>
            Coins: ${cooldownText(cooldown.coins)}<br>
            SP: ${cooldownText(cooldown.sp)}
        `;
    }

    function cooldownText(time) {
        const left = time - Date.now();

        if (left <= 0) return 'READY';

        const sec = Math.ceil(left / 1000);
        const min = Math.floor(sec / 60);
        const s = sec % 60;

        return `${min}:${String(s).padStart(2, '0')}`;
    }

    setInterval(updateUI, 500);

    /* =========================
       FIND GAME CANVAS
    ========================= */

    function getCanvas() {
        const canvases = [...document.querySelectorAll('canvas')];

        if (!canvases.length) return null;

        return canvases.sort((a, b) => {
            return (b.width * b.height) -
                   (a.width * a.height);
        })[0];
    }

    /* =========================
       REMEMBER REAL PLAYER CLICK
    ========================= */

    document.addEventListener('mousedown', function (e) {

        if (e.button !== 0) return;

        if (e.target.closest &&
            e.target.closest('#agmaAutoPickUI')) {
            return;
        }

        const canvas = getCanvas();

        if (!canvas) return;

        /*
         * Chỉ ghi nhận click nằm trên game canvas.
         * Đây là cell mà người chơi tự chọn.
         */

        const rect = canvas.getBoundingClientRect();

        if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        ) {
            target = {
                x: e.clientX,
                y: e.clientY
            };

            updateUI();
        }

    }, true);

    /* =========================
       SYNTHETIC CANVAS CLICK
    ========================= */

    function clickTarget() {

        if (!target) return false;

        const canvas = getCanvas();

        if (!canvas) return false;

        const rect = canvas.getBoundingClientRect();

        const x = target.x;
        const y = target.y;

        const opts = {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: 1,
            view: window
        };

        canvas.dispatchEvent(
            new MouseEvent('mousedown', opts)
        );

        canvas.dispatchEvent(
            new MouseEvent('mouseup', opts)
        );

        canvas.dispatchEvent(
            new MouseEvent('click', opts)
        );

        return true;
    }

    /* =========================
       FIND MENU ITEM
    ========================= */

    function findText(text) {

        const wanted = text.toLowerCase();

        const all = document.querySelectorAll(
            'button, div, span, a, li'
        );

        for (const el of all) {

            if (!el.offsetParent) continue;

            const value =
                (el.innerText ||
                 el.textContent ||
                 '')
                .trim()
                .toLowerCase();

            if (value === wanted) {
                return el;
            }
        }

        return null;
    }

    function clickMenu(text) {

        const el = findText(text);

        if (!el) return false;

        el.click();

        return true;
    }

    /* =========================
       PICKPOCKET
    ========================= */

    async function openPickpocket() {

        clickTarget();

        await sleep(MENU_WAIT);

        const pick = findText('pickpocket');

        if (!pick) return false;

        pick.click();

        return true;
    }

    /* =========================
       SKILL ACTION
    ========================= */

    async function useSkill(type, text) {

        if (!enabled) return false;

        if (Date.now() < cooldown[type]) {
            return false;
        }

        /*
         * Mở lại menu trên target
         */

        const opened = await openPickpocket();

        if (!opened) return false;

        await sleep(MENU_WAIT);

        const skill = findText(text);

        if (!skill) return false;

        /*
         * QUAN TRỌNG:
         * cooldown bắt đầu NGAY KHI CLICK SKILL
         */

        skill.click();

        cooldown[type] =
            Date.now() + COOLDOWN[type];

        updateUI();

        await sleep(ACTION_WAIT);

        return true;
    }

    /* =========================
       MAIN LOOP
    ========================= */

    async function worker() {

        if (working) return;

        working = true;

        try {

            while (enabled) {

                if (!target) {
                    await sleep(500);
                    continue;
                }

                let used = false;

                /*
                 * Thứ tự:
                 * Mass -> Coins -> SP
                 */

                if (Date.now() >= cooldown.mass) {

                    used = await useSkill(
                        'mass',
                        'steal mass'
                    );

                    if (used) {
                        await sleep(TARGET_WAIT);
                        continue;
                    }
                }

                if (Date.now() >= cooldown.coins) {

                    used = await useSkill(
                        'coins',
                        'steal coins'
                    );

                    if (used) {
                        await sleep(TARGET_WAIT);
                        continue;
                    }
                }

                if (Date.now() >= cooldown.sp) {

                    used = await useSkill(
                        'sp',
                        'steal sp'
                    );

                    if (used) {
                        await sleep(TARGET_WAIT);
                        continue;
                    }
                }

                /*
                 * Chưa có skill nào ready.
                 * Chờ 500ms rồi kiểm tra lại.
                 */

                await sleep(500);
            }

        } finally {
            working = false;
        }
    }

    /* =========================
       ON / OFF
    ========================= */

    function toggle() {

        enabled = !enabled;

        updateUI();

        if (enabled) {
            worker();
        }
    }

    /* =========================
       UTILITY
    ========================= */

    function sleep(ms) {
        return new Promise(resolve =>
            setTimeout(resolve, ms)
        );
    }

    /* =========================
       START UI
    ========================= */

    function startUI() {

        if (document.body) {
            createUI();
        } else {
            setTimeout(startUI, 50);
        }
    }

    startUI();

})();
