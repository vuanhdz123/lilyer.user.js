// ==UserScript==
// @name         Agma PC Auto Pickpocket - 5s Hold
// @namespace    agma-auto-pickpocket
// @version      2.0
// @description  Auto Pickpocket with 5 second hold + cooldown
// @match        *://agma.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /* =========================================================
       CÀI ĐẶT
    ========================================================= */

    const HOLD_TIME = 5000;          // Giữ mục tiêu 5 giây

    const COOLDOWN = {
        mass: 10 * 60 * 1000,        // 10 phút
        coins: 20 * 60 * 1000,       // 20 phút
        sp: 20 * 60 * 1000           // 20 phút
    };

    const MENU_WAIT = 700;
    const ACTION_WAIT = 700;
    const RETRY_WAIT = 1000;

    /* =========================================================
       BIẾN
    ========================================================= */

    let enabled = false;
    let working = false;

    let target = null;

    const cooldown = {
        mass: 0,
        coins: 0,
        sp: 0
    };

    /* =========================================================
       TẠO MENU
    ========================================================= */

    function createUI() {

        if (document.getElementById('agmaAutoPickUI')) {
            return;
        }

        const box = document.createElement('div');

        box.id = 'agmaAutoPickUI';

        box.style.cssText = `
            position:fixed;
            top:15px;
            left:15px;
            z-index:2147483647;
            width:300px;
            background:rgba(20,20,20,.94);
            color:#fff;
            padding:16px;
            border-radius:14px;
            font-family:Arial,sans-serif;
            font-size:16px;
            box-shadow:0 5px 25px rgba(0,0,0,.6);
            user-select:none;
        `;

        box.innerHTML = `
            <div style="
                font-size:20px;
                font-weight:bold;
                margin-bottom:12px;
            ">
                AGMA AUTO PICKPOCKET
            </div>

            <button id="agmaAutoToggle"
                style="
                    width:100%;
                    height:55px;
                    border:0;
                    border-radius:12px;
                    background:#555;
                    color:white;
                    font-size:20px;
                    font-weight:bold;
                ">
                OFF
            </button>

            <div id="agmaTargetStatus"
                style="
                    margin-top:12px;
                    padding-top:8px;
                    border-top:1px solid #555;
                ">
                Target: chưa chọn
            </div>

            <div id="agmaCooldownStatus"
                style="
                    margin-top:8px;
                    line-height:1.6;
                ">
                Mass: READY<br>
                Coins: READY<br>
                SP: READY
            </div>

            <div style="
                margin-top:10px;
                font-size:12px;
                color:#bbb;
            ">
                Giữ chuột trái vào cell đối phương để chọn mục tiêu.
            </div>
        `;

        document.body.appendChild(box);

        document
            .getElementById('agmaAutoToggle')
            .addEventListener('click', toggle);

        updateUI();
    }

    /* =========================================================
       CẬP NHẬT UI
    ========================================================= */

    function updateUI() {

        const targetStatus =
            document.getElementById('agmaTargetStatus');

        const cooldownStatus =
            document.getElementById('agmaCooldownStatus');

        const toggleButton =
            document.getElementById('agmaAutoToggle');

        if (!targetStatus ||
            !cooldownStatus ||
            !toggleButton) {
            return;
        }

        if (target) {
            targetStatus.textContent =
                `Target: ${Math.round(target.x)}, ${Math.round(target.y)}`;
        } else {
            targetStatus.textContent =
                'Target: chưa chọn';
        }

        if (enabled) {
            toggleButton.textContent = 'ON';
            toggleButton.style.background = '#16a34a';
        } else {
            toggleButton.textContent = 'OFF';
            toggleButton.style.background = '#555';
        }

        cooldownStatus.innerHTML = `
            Mass: ${formatCooldown(cooldown.mass)}<br>
            Coins: ${formatCooldown(cooldown.coins)}<br>
            SP: ${formatCooldown(cooldown.sp)}
        `;
    }

    function formatCooldown(endTime) {

        const remaining = endTime - Date.now();

        if (remaining <= 0) {
            return 'READY';
        }

        let seconds =
            Math.ceil(remaining / 1000);

        const minutes =
            Math.floor(seconds / 60);

        seconds %= 60;

        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    /* =========================================================
       TÌM CANVAS GAME
    ========================================================= */

    function getCanvas() {

        const canvases =
            Array.from(document.querySelectorAll('canvas'));

        if (!canvases.length) {
            return null;
        }

        canvases.sort((a, b) => {

            const areaA =
                a.width * a.height;

            const areaB =
                b.width * b.height;

            return areaB - areaA;
        });

        return canvases[0];
    }

    /* =========================================================
       GHI NHẬN CELL MỤC TIÊU
    ========================================================= */

    document.addEventListener(
        'mousedown',
        function (event) {

            if (event.button !== 0) {
                return;
            }

            if (
                event.target &&
                event.target.closest &&
                event.target.closest('#agmaAutoPickUI')
            ) {
                return;
            }

            const canvas = getCanvas();

            if (!canvas) {
                return;
            }

            const rect =
                canvas.getBoundingClientRect();

            const inside =
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom;

            if (!inside) {
                return;
            }

            /*
             * Lưu vị trí cell mà người chơi
             * vừa thao tác.
             */

            target = {
                x: event.clientX,
                y: event.clientY
            };

            updateUI();

        },
        true
    );

    /* =========================================================
       GIỮ CHUỘT 5 GIÂY
    ========================================================= */

    async function holdTarget() {

        if (!target) {
            return false;
        }

        const canvas = getCanvas();

        if (!canvas) {
            return false;
        }

        const x = target.x;
        const y = target.y;

        const downEvent = new MouseEvent(
            'mousedown',
            {
                bubbles: true,
                cancelable: true,
                view: window,

                clientX: x,
                clientY: y,

                button: 0,
                buttons: 1
            }
        );

        /*
         * Bắt đầu giữ chuột.
         */

        canvas.dispatchEvent(downEvent);

        /*
         * GIỮ ĐỦ 5 GIÂY
         */

        await sleep(HOLD_TIME);

        /*
         * Thả chuột.
         */

        const upEvent = new MouseEvent(
            'mouseup',
            {
                bubbles: true,
                cancelable: true,
                view: window,

                clientX: x,
                clientY: y,

                button: 0,
                buttons: 0
            }
        );

        canvas.dispatchEvent(upEvent);

        return true;
    }

    /* =========================================================
       TÌM NÚT THEO CHỮ
    ========================================================= */

    function findElementByText(text) {

        const wanted =
            text.trim().toLowerCase();

        const elements =
            document.querySelectorAll(
                'button, div, span, a, li'
            );

        for (const element of elements) {

            if (!element.offsetParent) {
                continue;
            }

            const value =
                (
                    element.innerText ||
                    element.textContent ||
                    ''
                )
                .trim()
                .toLowerCase();

            if (value === wanted) {
                return element;
            }
        }

        return null;
    }

    /* =========================================================
       MỞ MENU PICKPOCKET
    ========================================================= */

    async function openPickpocket() {

        if (!target) {
            return false;
        }

        /*
         * Giữ cell đối phương 5 giây.
         */

        const held =
            await holdTarget();

        if (!held) {
            return false;
        }

        /*
         * Chờ menu xuất hiện.
         */

        await sleep(MENU_WAIT);

        const pickpocket =
            findElementByText('Pickpocket');

        if (!pickpocket) {
            return false;
        }

        pickpocket.click();

        return true;
    }

    /* =========================================================
       DÙNG SKILL
    ========================================================= */

    async function useSkill(
        type,
        skillName
    ) {

        if (!enabled) {
            return false;
        }

        /*
         * Kiểm tra cooldown.
         */

        if (Date.now() < cooldown[type]) {
            return false;
        }

        /*
         * Mở menu Pickpocket.
         */

        const opened =
            await openPickpocket();

        if (!opened) {
            return false;
        }

        await sleep(MENU_WAIT);

        /*
         * Tìm skill.
         */

        const skill =
            findElementByText(skillName);

        if (!skill) {
            return false;
        }

        /*
         * ====================================================
         * QUAN TRỌNG:
         * Cooldown bắt đầu NGAY LÚC CLICK SKILL.
         * ====================================================
         */

        skill.click();

        cooldown[type] =
            Date.now() + COOLDOWN[type];

        updateUI();

        await sleep(ACTION_WAIT);

        return true;
    }

    /* =========================================================
       VÒNG LẶP AUTO
    ========================================================= */

    async function worker() {

        if (working) {
            return;
        }

        working = true;

        try {

            while (enabled) {

                if (!target) {
                    await sleep(500);
                    continue;
                }

                let used = false;

                /*
                 * =============================================
                 * 1. STEAL MASS
                 * =============================================
                 */

                if (
                    Date.now() >= cooldown.mass
                ) {

                    used =
                        await useSkill(
                            'mass',
                            'Steal Mass'
                        );

                    if (used) {
                        continue;
                    }
                }

                /*
                 * =============================================
                 * 2. STEAL COINS
                 * =============================================
                 */

                if (
                    Date.now() >= cooldown.coins
                ) {

                    used =
                        await useSkill(
                            'coins',
                            'Steal Coins'
                        );

                    if (used) {
                        continue;
                    }
                }

                /*
                 * =============================================
                 * 3. STEAL SP
                 * =============================================
                 */

                if (
                    Date.now() >= cooldown.sp
                ) {

                    used =
                        await useSkill(
                            'sp',
                            'Steal SP'
                        );

                    if (used) {
                        continue;
                    }
                }

                /*
                 * Không có skill nào sẵn sàng.
                 * Chờ rồi kiểm tra lại.
                 */

                await sleep(RETRY_WAIT);
            }

        } finally {

            working = false;

        }
    }

    /* =========================================================
       ON / OFF
    ========================================================= */

    function toggle() {

        enabled = !enabled;

        updateUI();

        if (enabled) {
            worker();
        }
    }

    /* =========================================================
       UTILITY
    ========================================================= */

    function sleep(milliseconds) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    milliseconds
                )
        );
    }

    /* =========================================================
       KHỞI ĐỘNG
    ========================================================= */

    function start() {

        if (!document.body) {
            setTimeout(start, 100);
            return;
        }

        createUI();
    }

    start();

})();
