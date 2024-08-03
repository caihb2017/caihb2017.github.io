let isDragging = false;
let startX, startY;

const image = document.getElementById('image');
const overlay = document.getElementById('overlayCanvas');
const imageContainer = document.getElementById('imageContainer');

document.addEventListener('pointerdown', (event) => {
  if (event.target.id === 'image') {
    isDragging = true;
    const rect = imageContainer.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;

    // 初始化虚线框位置和大小
    overlay.style.left = `${startX}px`;
    overlay.style.top = `${startY}px`;
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    overlay.style.display = 'block';
  }
});

document.addEventListener('pointermove', (event) => {
  if (isDragging) {
    const rect = imageContainer.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const width = currentX - startX;
    const height = currentY - startY;

    // 更新虚线框的位置和大小
    overlay.style.left = `${Math.min(startX, currentX)}px`;
    overlay.style.top = `${Math.min(startY, currentY)}px`;
    overlay.style.width = `${Math.abs(width)}px`;
    overlay.style.height = `${Math.abs(height)}px`;
  }
});

document.addEventListener('pointerup', (event) => {
  if (isDragging) {
    isDragging = false;
    // 清除虚线框
    overlay.style.display = 'none';
  }
});
