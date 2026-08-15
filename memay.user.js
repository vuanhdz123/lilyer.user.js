// ==UserScript==
// @name         Agma Auto Feed - Lilyer
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Lilyer Auto Feed - Auto Space - Auto Respawn - Auto M - Route ON/OFF
// @match        *://agma.io/*
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const myWin =
        (typeof unsafeWindow !== 'undefined')
            ? unsafeWindow
            : window;

    if (myWin.AS_MENU) return;

    // =========================================================
    // TRẠNG THÁI HỆ THỐNG
    // =========================================================

    let on = false;

    let autoSpace = true;
    let autoRespawn = true;
    let autoM = true;

    let spawnTimer = null;
    let spaceTimer = null;
    let aliveTimer = null;

    let activeSocket = null;
    let wasDead = false;

    // =========================================================
    // AUTO M
    // =========================================================

    let playerAliveSince = null;
    let mPressedThisLife = false;

    const AUTO_M_TIME = 20000;

    // =========================================================
    // DANH SÁCH TỌA ĐỘ
    // =========================================================

    const targets = [
        {
            name: "A5",
            x: 11267,
            y: 1472,
            enabled: true
        },

        {
            name: "E5",
            x: 11005,
            y: 10864,
            enabled: true
        },

        {
            name: "E1",
            x: 1107,
            y: 10906,
            enabled: true
        },

        {
            name: "C1",
            x: 764,
            y: 5862,
            enabled: true
        },

        {
            name: "C5",
            x: 10984,
            y: 5776,
            enabled: true
        }
    ];

    let currentTargetIndex = 0;

    // =========================================================
    // TÌM TỌA ĐỘ ĐƯỢC BẬT TIẾP THEO
    // =========================================================

    function findNextEnabledTarget(startIndex) {

        if (!targets.length) {
            return -1;
        }

        for (let i = 1; i <= targets.length; i++) {

            const index =
                (startIndex + i) % targets.length;

            if (targets[index].enabled) {
                return index;
            }
        }

        if (
            targets[startIndex] &&
            targets[startIndex].enabled
        ) {
            return startIndex;
        }

        return -1;
    }

    // =========================================================
    // KIỂM TRA TỌA ĐỘ
    // =========================================================

    function hasEnabledTarget() {

        return targets.some(
            target => target.enabled
        );
    }

    // =========================================================
    // LẤY TỌA ĐỘ NHÂN VẬT
    // =========================================================

    let player = null;

    let arrays = new Set();

    const oldPush =
        Array.prototype.push;

    let prop =
        window.prop || null;

    function cellLike(o) {

        return o &&
            typeof o === "object" &&
            typeof o.x === "number" &&
            typeof o.y === "number" &&
            typeof o.id === "number" &&
            typeof o.color === "string";
    }

    function own(o) {

        if (!cellLike(o)) {
            return false;
        }

        if (prop && prop[45] in o) {
            return o[prop[45]] === true;
        }

        return (
            o.oOwnCell === true ||
            o.ownCell === true
        );
    }

    function inspect(a) {

        if (!a || !a.length) {
            return;
        }

        let sample =
            a.find(cellLike);

        if (!sample) {
            return;
        }

        if (!prop) {

            prop =
                window.prop ||
                Object.keys(sample);
        }

        arrays.add(a);

        for (
            let i = a.length - 1;
            i >= 0;
            i--
        ) {

            if (own(a[i])) {

                player = a[i];

                return;
            }
        }
    }

    Array.prototype.push =
        function(...args) {

            try {

                if (
                    this.length &&
                    cellLike(this[0])
                ) {

                    inspect(this);
                }

                for (const o of args) {

                    if (own(o)) {

                        player = o;
                    }
                }

            } catch(e) {}

            return oldPush.apply(
                this,
                args
            );
        };

    // =========================================================
    // QUÉT PLAYER
    // =========================================================

    function refreshPlayer() {

        let found = null;

        for (const a of arrays) {

            if (!a || !a.length) {
                continue;
            }

            for (
                let i = a.length - 1;
                i >= 0;
                i--
            ) {

                if (own(a[i])) {

                    found = a[i];
                    break;
                }
            }

            if (found) {
                break;
            }
        }

        player = found;

        return found;
    }

    // =========================================================
    // AUTO M - THEO DÕI CELL SỐNG 20 GIÂY
    // =========================================================

    function pressM() {

        try {

            const down =
                new KeyboardEvent(
                    "keydown",
                    {
                        key: "m",
                        code: "KeyM",
                        keyCode: 77,
                        which: 77,
                        bubbles: true,
                        cancelable: true
                    }
                );

            document.dispatchEvent(down);
            window.dispatchEvent(down);

            const up =
                new KeyboardEvent(
                    "keyup",
                    {
                        key: "m",
                        code: "KeyM",
                        keyCode: 77,
                        which: 77,
                        bubbles: true,
                        cancelable: true
                    }
                );

            document.dispatchEvent(up);
            window.dispatchEvent(up);

        } catch(e) {}
    }

    function checkAutoM() {

        if (
            !on ||
            !autoM
        ) {

            playerAliveSince = null;
            mPressedThisLife = false;

            return;
        }

        const currentPlayer =
            refreshPlayer();

        // -----------------------------------------------------
        // KHÔNG CÓ CELL
        // -----------------------------------------------------

        if (!currentPlayer) {

            playerAliveSince = null;
            mPressedThisLife = false;

            return;
        }

        // -----------------------------------------------------
        // CELL VỪA SPAWN / VỪA ĐƯỢC PHÁT HIỆN
        // -----------------------------------------------------

        if (playerAliveSince === null) {

            playerAliveSince =
                Date.now();

            mPressedThisLife = false;

            return;
        }

        // -----------------------------------------------------
        // ĐỦ 20 GIÂY
        // -----------------------------------------------------

        if (
            !mPressedThisLife &&
            Date.now() - playerAliveSince >=
                AUTO_M_TIME
        ) {

            pressM();

            mPressedThisLife = true;
        }
    }

    // Quét Auto M mỗi 250ms
    aliveTimer =
        setInterval(
            checkAutoM,
            250
        );

    // =========================================================
    // BẮT WEBSOCKET
    // =========================================================

    const WebSocketProto =
        (typeof myWin.WebSocket !== 'undefined')
            ? myWin.WebSocket.prototype
            : WebSocket.prototype;

    const originalSend =
        WebSocketProto.send;

    WebSocketProto.send =
        function() {

            activeSocket = this;

            let data = arguments[0];

            // =================================================
            // AUTO FEED
            // =================================================

            if (
                on &&
                hasEnabledTarget() &&
                data instanceof DataView &&
                data.byteLength >= 9 &&
                data.getUint8(0) === 0
            ) {

                const target =
                    targets[currentTargetIndex];

                if (
                    target &&
                    target.enabled
                ) {

                    data.setUint32(
                        1,
                        target.x,
                        true
                    );

                    data.setUint32(
                        5,
                        target.y,
                        true
                    );
                }
            }

            return originalSend.apply(
                this,
                arguments
            );
        };

    // =========================================================
    // MENU
    // =========================================================

    window.addEventListener(
        "DOMContentLoaded",
        () => {

            // =================================================
            // MENU BOX
            // =================================================

            const box =
                document.createElement("div");

            box.id = "AS_MENU";

            box.innerHTML = `

                <div class="lilyer-menu">

                    <div class="lilyer-deco deco1">🎀</div>
                    <div class="lilyer-deco deco2">♡</div>
                    <div class="lilyer-deco deco3">♡</div>

                    <div class="lilyer-header">

                        <div class="lilyer-logo">
                            🎀
                        </div>

                        <div class="lilyer-title-box">

                            <div class="lilyer-title">
                                LILYER FEEDER
                            </div>

                            <div class="lilyer-subtitle">
                                AGMA AUTO SYSTEM
                            </div>

                        </div>

                    </div>

                    <!-- STATUS -->

                    <div class="lilyer-status">

                        <div>

                            <span id="lilyerDot"></span>

                            <span id="lilyerStatus">
                                OFFLINE
                            </span>

                        </div>

                        <button id="lilyerPower">
                            ON
                        </button>

                    </div>

                    <!-- FEED ROUTE -->

                    <div class="lilyer-box">

                        <div class="lilyer-box-title">
                            ♡ FEED ROUTE
                        </div>

                        <div
                            class="route-item"
                            data-target="A5"
                        >

                            <span class="route-check">
                                ✓
                            </span>

                            <b>A5</b>

                            <small>
                                11267 , 1472
                            </small>

                            <span class="route-status">
                                ON
                            </span>

                        </div>

                        <div class="route-line"></div>

                        <div
                            class="route-item"
                            data-target="E5"
                        >

                            <span class="route-check">
                                ✓
                            </span>

                            <b>E5</b>

                            <small>
                                11005 , 10864
                            </small>

                            <span class="route-status">
                                ON
                            </span>

                        </div>

                        <div class="route-line"></div>

                        <div
                            class="route-item"
                            data-target="E1"
                        >

                            <span class="route-check">
                                ✓
                            </span>

                            <b>E1</b>

                            <small>
                                1107 , 10906
                            </small>

                            <span class="route-status">
                                ON
                            </span>

                        </div>

                        <div class="route-line"></div>

                        <div
                            class="route-item"
                            data-target="C1"
                        >

                            <span class="route-check">
                                ✓
                            </span>

                            <b>C1</b>

                            <small>
                                764 , 5862
                            </small>

                            <span class="route-status">
                                ON
                            </span>

                        </div>

                        <div class="route-line"></div>

                        <div
                            class="route-item"
                            data-target="C5"
                        >

                            <span class="route-check">
                                ✓
                            </span>

                            <b>C5</b>

                            <small>
                                10984 , 5776
                            </small>

                            <span class="route-status">
                                ON
                            </span>

                        </div>

                    </div>

                    <!-- SYSTEM -->

                    <div class="lilyer-box">

                        <div class="lilyer-box-title">
                            ♡ SYSTEM
                        </div>

                        <!-- AUTO FEED -->

                        <div class="system-row">

                            <div>

                                <b>
                                    Auto Feed
                                </b>

                                <small>
                                    Di chuyển theo tọa độ
                                </small>

                            </div>

                            <div
                                class="fake-switch"
                                id="feedSwitch"
                            >

                                <div></div>

                            </div>

                        </div>

                        <!-- AUTO SPACE -->

                        <div class="system-row">

                            <div>

                                <b>
                                    Auto Space
                                </b>

                                <small>
                                    Space mỗi 1 giây
                                </small>

                            </div>

                            <div
                                class="fake-switch active"
                                id="spaceSwitch"
                            >

                                <div></div>

                            </div>

                        </div>

                        <!-- AUTO RESPAWN -->

                        <div class="system-row">

                            <div>

                                <b>
                                    Auto Respawn
                                </b>

                                <small>
                                    Tự động hồi sinh
                                </small>

                            </div>

                            <div
                                class="fake-switch active"
                                id="respawnSwitch"
                            >

                                <div></div>

                            </div>

                        </div>

                        <!-- AUTO M -->

                        <div class="system-row">

                            <div>

                                <b>
                                    Auto M
                                </b>

                                <small>
                                    Cell sống 20 giây → Press M
                                </small>

                            </div>

                            <div
                                class="fake-switch active"
                                id="mSwitch"
                            >

                                <div></div>

                            </div>

                        </div>

                    </div>

                    <!-- DESTINATION -->

                    <div class="destination">

                        <div>
                            ĐANG ĐẾN
                        </div>

                        <strong id="lilyerTarget">
                            ---
                        </strong>

                    </div>

                    <!-- FOOTER -->

                    <div class="lilyer-footer">

                        <span>
                            Made with ♡
                        </span>

                        <b>
                            By Lilyer
                        </b>

                    </div>

                </div>
            `;

            // =================================================
            // NÚT ẨN / HIỆN MENU
            // =================================================

            const menuToggle =
                document.createElement("button");

            menuToggle.id =
                "lilyerMenuToggle";

            menuToggle.innerHTML =
                "🎀";

            menuToggle.title =
                "Ẩn Lilyer Feeder";

            // =================================================
            // STYLE
            // =================================================

            const style =
                document.createElement("style");

            style.textContent = `

                #lilyerMenuToggle {

                    position: fixed;

                    top: 28px;

                    right: 320px;

                    width: 42px;

                    height: 42px;

                    z-index: 2147483647;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    border:
                        2px solid #ff78ac;

                    border-radius: 13px;

                    cursor: pointer;

                    background:
                        linear-gradient(
                            145deg,
                            #fff8fb,
                            #ffd8e9
                        );

                    color: #c52e70;

                    font-size: 20px;

                    box-shadow:
                        0 6px 18px
                        rgba(255,50,130,.4),

                        inset 0 0 10px
                        rgba(255,255,255,.9);

                    transition:
                        right .2s ease,
                        transform .18s ease;
                }

                #lilyerMenuToggle:hover {

                    transform:
                        scale(1.08);

                }

                #lilyerMenuToggle:active {

                    transform:
                        scale(.92);

                }

                #AS_MENU {

                    position: fixed;

                    top: 18px;

                    right: 18px;

                    width: 290px;

                    z-index: 2147483646;

                    font-family:
                        Arial, sans-serif;

                    user-select: none;
                }

                #AS_MENU * {

                    box-sizing: border-box;
                }

                .lilyer-menu {

                    position: relative;

                    overflow: hidden;

                    padding: 14px;

                    border-radius: 20px;

                    background:

                        radial-gradient(
                            circle at 15% 15%,
                            rgba(255,255,255,.95)
                            0 3px,
                            transparent 4px
                        ),

                        radial-gradient(
                            circle at 90% 25%,
                            rgba(255,255,255,.8)
                            0 4px,
                            transparent 5px
                        ),

                        linear-gradient(
                            145deg,
                            #fff8fb,
                            #ffd8e9,
                            #ffb4d2
                        );

                    border:
                        2px solid #ff78ac;

                    box-shadow:

                        0 10px 35px
                        rgba(255,50,130,.35),

                        inset 0 0 20px
                        rgba(255,255,255,.8);
                }

                .lilyer-deco {

                    position: absolute;

                    pointer-events: none;

                    color:
                        rgba(230,50,120,.18);
                }

                .deco1 {

                    top: 5px;

                    right: 10px;

                    font-size: 25px;
                }

                .deco2 {

                    right: 8px;

                    bottom: 90px;

                    font-size: 35px;
                }

                .deco3 {

                    left: 4px;

                    bottom: 130px;

                    font-size: 25px;
                }

                .lilyer-header {

                    display: flex;

                    align-items: center;

                    gap: 10px;

                    padding-bottom: 12px;

                    border-bottom:
                        1px solid
                        rgba(180,50,100,.2);
                }

                .lilyer-logo {

                    width: 44px;

                    height: 44px;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    background: white;

                    border-radius: 13px;

                    border:
                        2px solid #ff8ab8;

                    font-size: 22px;

                    box-shadow:
                        0 3px 8px
                        rgba(200,50,110,.2);
                }

                .lilyer-title {

                    color: #c52e70;

                    font-size: 17px;

                    font-weight: 900;

                    letter-spacing: .6px;
                }

                .lilyer-subtitle {

                    margin-top: 3px;

                    color: #a45a77;

                    font-size: 9px;

                    letter-spacing: 1px;
                }

                .lilyer-status {

                    display: flex;

                    align-items: center;

                    justify-content: space-between;

                    margin-top: 12px;

                    padding: 9px 10px;

                    background:
                        rgba(255,255,255,.75);

                    border-radius: 12px;

                    border:
                        1px solid
                        rgba(200,60,120,.2);
                }

                .lilyer-status > div {

                    display: flex;

                    align-items: center;

                    gap: 7px;

                    color: #a3486c;

                    font-size: 10px;

                    font-weight: 900;
                }

                #lilyerDot {

                    width: 8px;

                    height: 8px;

                    border-radius: 50%;

                    background: #ff3f67;

                    box-shadow:
                        0 0 8px #ff3f67;
                }

                #lilyerPower {

                    border: 0;

                    padding: 6px 15px;

                    border-radius: 9px;

                    cursor: pointer;

                    color: white;

                    background:
                        linear-gradient(
                            135deg,
                            #ff5799,
                            #d72d70
                        );

                    font-size: 11px;

                    font-weight: 900;

                    box-shadow:
                        0 3px 8px
                        rgba(210,40,100,.3);
                }

                #lilyerPower:hover {

                    filter:
                        brightness(1.08);
                }

                .lilyer-box {

                    margin-top: 12px;

                    padding: 11px;

                    background:
                        rgba(255,255,255,.66);

                    border-radius: 13px;

                    border:
                        1px solid
                        rgba(200,60,120,.2);
                }

                .lilyer-box-title {

                    margin-bottom: 8px;

                    color: #c32d70;

                    font-size: 11px;

                    font-weight: 900;

                    letter-spacing: .7px;
                }

                .route-item {

                    display: grid;

                    grid-template-columns:
                        19px
                        32px
                        1fr
                        36px;

                    align-items: center;

                    gap: 7px;

                    padding: 5px 4px;

                    border-radius: 8px;

                    color: #68334c;

                    font-size: 11px;

                    cursor: pointer;

                    transition:
                        background .15s ease,
                        opacity .15s ease;
                }

                .route-item:hover {

                    background:
                        rgba(255,210,230,.7);
                }

                .route-item.current {

                    background: #ffe0ed;

                    color: #ce286d;
                }

                .route-item.disabled {

                    opacity: .42;

                    background:
                        rgba(220,190,200,.2);
                }

                .route-check {

                    width: 17px;

                    height: 17px;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    border-radius: 5px;

                    color: white;

                    background: #ff61a0;

                    font-size: 10px;

                    font-weight: bold;
                }

                .route-item.disabled
                .route-check {

                    background: #b99ca8;
                }

                .route-status {

                    text-align: right;

                    font-size: 8px;

                    font-weight: 900;

                    color: #df3478;
                }

                .route-item.disabled
                .route-status {

                    color: #9c858e;
                }

                .route-item small {

                    text-align: right;

                    color: #a66a83;

                    font-size: 8px;
                }

                .route-line {

                    width: 1px;

                    height: 7px;

                    margin-left: 12px;

                    background: #ef9abc;
                }

                .system-row {

                    display: flex;

                    align-items: center;

                    justify-content: space-between;

                    padding: 7px 2px;
                }

                .system-row b {

                    display: block;

                    color: #68334c;

                    font-size: 11px;
                }

                .system-row small {

                    display: block;

                    margin-top: 2px;

                    color: #a66a83;

                    font-size: 8px;
                }

                .fake-switch {

                    position: relative;

                    width: 36px;

                    height: 19px;

                    border-radius: 20px;

                    background: #d6b4c3;

                    cursor: pointer;

                    flex-shrink: 0;

                    transition:
                        background .15s ease;
                }

                .fake-switch.active {

                    background:
                        linear-gradient(
                            90deg,
                            #ff5b9d,
                            #df3478
                        );
                }

                .fake-switch div {

                    position: absolute;

                    top: 3px;

                    left: 3px;

                    width: 13px;

                    height: 13px;

                    border-radius: 50%;

                    background: white;

                    box-shadow:
                        0 1px 4px
                        rgba(0,0,0,.2);

                    transition:
                        left .15s ease;
                }

                .fake-switch.active div {

                    left: 20px;
                }

                .destination {

                    margin-top: 12px;

                    padding: 10px;

                    text-align: center;

                    border-radius: 11px;

                    color: white;

                    background:
                        linear-gradient(
                            135deg,
                            #ff5b9d,
                            #db3477
                        );

                    box-shadow:
                        0 4px 10px
                        rgba(210,45,110,.25);
                }

                .destination div {

                    font-size: 8px;

                    opacity: .8;

                    letter-spacing: 1px;

                    font-weight: bold;
                }

                #lilyerTarget {

                    display: block;

                    margin-top: 3px;

                    font-size: 15px;
                }

                .lilyer-footer {

                    display: flex;

                    justify-content: space-between;

                    padding: 10px 3px 1px;

                    color: #a15c78;

                    font-size: 9px;
                }

                .lilyer-footer b {

                    color: #c52d70;
                }

                @media (max-width: 700px) {

                    #AS_MENU {

                        right: 10px;

                        top: 10px;

                        width: 280px;
                    }

                    #lilyerMenuToggle {

                        right: 300px;

                        top: 20px;
                    }
                }
            `;

            document.head.appendChild(style);

            document.body.appendChild(box);
            document.body.appendChild(menuToggle);

            // =================================================
            // LẤY ELEMENT
            // =================================================

            const statusText =
                document.getElementById(
                    "lilyerStatus"
                );

            const statusDot =
                document.getElementById(
                    "lilyerDot"
                );

            const powerBtn =
                document.getElementById(
                    "lilyerPower"
                );

            const targetText =
                document.getElementById(
                    "lilyerTarget"
                );

            const feedSwitch =
                document.getElementById(
                    "feedSwitch"
                );

            const spaceSwitch =
                document.getElementById(
                    "spaceSwitch"
                );

            const respawnSwitch =
                document.getElementById(
                    "respawnSwitch"
                );

            const mSwitch =
                document.getElementById(
                    "mSwitch"
                );

            // =================================================
            // ẨN / HIỆN MENU
            // =================================================

            let menuVisible = true;

            menuToggle.style.display =
                "flex";

            function toggleMenu() {

                menuVisible =
                    !menuVisible;

                if (menuVisible) {

                    box.style.display =
                        "block";

                    menuToggle.style.right =
                        "320px";

                    menuToggle.title =
                        "Ẩn Lilyer Feeder";

                } else {

                    box.style.display =
                        "none";

                    menuToggle.style.right =
                        "18px";

                    menuToggle.title =
                        "Hiện Lilyer Feeder";
                }
            }

            menuToggle.addEventListener(
                "click",
                function(e) {

                    e.preventDefault();
                    e.stopPropagation();

                    toggleMenu();

                },
                true
            );

            // =================================================
            // UPDATE ROUTE UI
            // =================================================

            function updateRouteUI() {

                document
                    .querySelectorAll(
                        ".route-item"
                    )
                    .forEach(item => {

                        const name =
                            item.dataset.target;

                        const target =
                            targets.find(
                                t =>
                                    t.name === name
                            );

                        if (!target) {
                            return;
                        }

                        const check =
                            item.querySelector(
                                ".route-check"
                            );

                        const status =
                            item.querySelector(
                                ".route-status"
                            );

                        if (target.enabled) {

                            item.classList
                                .remove(
                                    "disabled"
                                );

                            check.textContent =
                                "✓";

                            status.textContent =
                                "ON";

                        } else {

                            item.classList
                                .add(
                                    "disabled"
                                );

                            check.textContent =
                                "×";

                            status.textContent =
                                "OFF";
                        }

                        if (
                            target.enabled &&
                            currentTargetIndex ===
                                targets.indexOf(target)
                        ) {

                            item.classList
                                .add(
                                    "current"
                                );

                        } else {

                            item.classList
                                .remove(
                                    "current"
                                );
                        }
                    });
            }

            // =================================================
            // UPDATE SYSTEM UI
            // =================================================

            function updateUI() {

                // MAIN

                statusText.textContent =
                    on
                        ? "ONLINE"
                        : "OFFLINE";

                powerBtn.textContent =
                    on
                        ? "OFF"
                        : "ON";

                statusDot.style.background =
                    on
                        ? "#32d67b"
                        : "#ff3f67";

                statusDot.style.boxShadow =
                    on
                        ? "0 0 8px #32d67b"
                        : "0 0 8px #ff3f67";

                // AUTO FEED

                if (on) {

                    feedSwitch.classList
                        .add("active");

                } else {

                    feedSwitch.classList
                        .remove("active");
                }

                // AUTO SPACE

                if (autoSpace) {

                    spaceSwitch.classList
                        .add("active");

                } else {

                    spaceSwitch.classList
                        .remove("active");
                }

                // AUTO RESPAWN

                if (autoRespawn) {

                    respawnSwitch.classList
                        .add("active");

                } else {

                    respawnSwitch.classList
                        .remove("active");
                }

                // AUTO M

                if (autoM) {

                    mSwitch.classList
                        .add("active");

                } else {

                    mSwitch.classList
                        .remove("active");
                }

                // DESTINATION

                if (
                    on &&
                    hasEnabledTarget()
                ) {

                    const target =
                        targets[
                            currentTargetIndex
                        ];

                    if (
                        target &&
                        target.enabled
                    ) {

                        targetText.textContent =
                            `${target.name} (${target.x}, ${target.y})`;

                    } else {

                        targetText.textContent =
                            "---";
                    }

                } else {

                    targetText.textContent =
                        "---";
                }

                updateRouteUI();
            }

            // =================================================
            // CLICK TỪNG TỌA ĐỘ
            // =================================================

            document
                .querySelectorAll(
                    ".route-item"
                )
                .forEach(item => {

                    item.addEventListener(
                        "click",
                        () => {

                            const name =
                                item.dataset.target;

                            const target =
                                targets.find(
                                    t =>
                                        t.name ===
                                        name
                                );

                            if (!target) {
                                return;
                            }

                            if (
                                target.enabled &&
                                targets.filter(
                                    t =>
                                        t.enabled
                                ).length === 1
                            ) {

                                return;
                            }

                            target.enabled =
                                !target.enabled;

                            if (
                                !target.enabled &&
                                currentTargetIndex ===
                                    targets.indexOf(target)
                            ) {

                                const next =
                                    findNextEnabledTarget(
                                        currentTargetIndex
                                    );

                                if (next !== -1) {

                                    currentTargetIndex =
                                        next;
                                }
                            }

                            updateUI();
                        }
                    );
                });

            // =================================================
            // AUTO SPACE ON / OFF
            // =================================================

            spaceSwitch.onclick = () => {

                autoSpace =
                    !autoSpace;

                updateUI();
            };

            // =================================================
            // AUTO RESPAWN ON / OFF
            // =================================================

            respawnSwitch.onclick = () => {

                autoRespawn =
                    !autoRespawn;

                updateUI();
            };

            // =================================================
            // AUTO M ON / OFF
            // =================================================

            mSwitch.onclick = () => {

                autoM =
                    !autoM;

                if (!autoM) {

                    playerAliveSince =
                        null;

                    mPressedThisLife =
                        false;
                }

                updateUI();
            };

            // =================================================
            // AUTO FEED ON / OFF
            // =================================================

            powerBtn.onclick = () => {

                on = !on;

                if (on) {

                    if (
                        !targets[
                            currentTargetIndex
                        ].enabled
                    ) {

                        const first =
                            targets.findIndex(
                                target =>
                                    target.enabled
                            );

                        if (first !== -1) {

                            currentTargetIndex =
                                first;
                        }
                    }

                    wasDead = false;

                    // Reset Auto M
                    playerAliveSince =
                        null;

                    mPressedThisLife =
                        false;

                    // AUTO RESPAWN TIMER

                    if (!spawnTimer) {

                        spawnTimer =
                            setInterval(
                                checkAndRespawn,
                                500
                            );
                    }

                    // AUTO SPACE TIMER

                    if (!spaceTimer) {

                        spaceTimer =
                            setInterval(
                                sendSpace,
                                1000
                            );
                    }

                } else {

                    clearInterval(
                        spawnTimer
                    );

                    clearInterval(
                        spaceTimer
                    );

                    spawnTimer = null;
                    spaceTimer = null;

                    // Reset Auto M
                    playerAliveSince =
                        null;

                    mPressedThisLife =
                        false;
                }

                updateUI();
            };

            // =================================================
            // AUTO SPAWN + CHUYỂN TỌA ĐỘ
            // =================================================

            function checkAndRespawn() {

                if (
                    !on ||
                    !autoRespawn
                ) {

                    return;
                }

                const advert =
                    document.getElementById(
                        'advert'
                    );

                const playBtn =
                    document.getElementById(
                        'playBtn'
                    );

                const isDead =

                    (
                        advert &&
                        advert.style.display ===
                            'block'
                    )

                    ||

                    (
                        playBtn &&
                        playBtn.offsetHeight > 0
                    );

                if (isDead) {

                    // Reset Auto M khi chết

                    playerAliveSince =
                        null;

                    mPressedThisLife =
                        false;

                    // CHUYỂN TỌA ĐỘ

                    if (!wasDead) {

                        const next =
                            findNextEnabledTarget(
                                currentTargetIndex
                            );

                        if (next !== -1) {

                            currentTargetIndex =
                                next;
                        }

                        wasDead = true;
                    }

                    // ĐÓNG QUẢNG CÁO

                    if (
                        typeof myWin.closeAdvert ===
                        'function'
                    ) {

                        try {

                            myWin.closeAdvert();

                        } catch(e) {}
                    }

                    // LẤY NICK

                    const nickInput =
                        document.getElementById(
                            'nick'
                        );

                    const nickName =
                        nickInput
                            ? nickInput.value
                            : '';

                    // RESPAWN

                    if (
                        typeof myWin.setNick ===
                        'function'
                    ) {

                        myWin.setNick(
                            nickName
                        );

                    } else if (
                        typeof myWin.rspwn ===
                        'function'
                    ) {

                        myWin.rspwn(
                            nickName
                        );

                    } else if (
                        playBtn
                    ) {

                        playBtn.click();
                    }

                } else {

                    wasDead = false;
                }
            }

            // =================================================
            // AUTO SPACE
            // =================================================

            function sendSpace() {

                if (
                    !on ||
                    !autoSpace ||
                    wasDead ||
                    !activeSocket ||
                    activeSocket.readyState !==
                        WebSocket.OPEN
                ) {

                    return;
                }

                const splitBuffer =
                    new ArrayBuffer(1);

                const view =
                    new DataView(
                        splitBuffer
                    );

                view.setUint8(
                    0,
                    17
                );

                originalSend.call(
                    activeSocket,
                    splitBuffer
                );
            }

            // =================================================
            // UPDATE ĐỊNH KỲ
            // =================================================

            setInterval(
                updateUI,
                250
            );

            // =================================================
            // KHỞI TẠO
            // =================================================

            updateUI();

            // =================================================
            // STOP SCRIPT
            // =================================================

            myWin.AS_MENU = {

                stop() {

                    on = false;

                    clearInterval(
                        spawnTimer
                    );

                    clearInterval(
                        spaceTimer
                    );

                    clearInterval(
                        aliveTimer
                    );

                    spawnTimer = null;
                    spaceTimer = null;
                    aliveTimer = null;

                    playerAliveSince =
                        null;

                    mPressedThisLife =
                        false;

                    box.remove();

                    menuToggle.remove();

                    style.remove();

                    delete myWin.AS_MENU;
                }
            };

        }
    );

})();
