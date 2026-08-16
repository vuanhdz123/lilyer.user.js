async function holdTarget() {
    if (!target) return false;

    const canvas = getCanvas();
    if (!canvas) return false;

    const x = target.x;
    const y = target.y;

    const base = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1,
        view: window
    };

    // Bắt đầu giữ chuột
    canvas.dispatchEvent(
        new MouseEvent('mousedown', base)
    );

    // GIỮ 5 GIÂY
    await sleep(5000);

    // Thả chuột
    canvas.dispatchEvent(
        new MouseEvent('mouseup', {
            ...base,
            buttons: 0
        })
    );

    return true;
}
