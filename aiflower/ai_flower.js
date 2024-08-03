// ai_flower.js

// 全局变量
let model;
let labelMap = {};
let leabelEnCn = {};
const topK = 5;

// 仅作为是否指定花卉的标志
let isSelectRect = false;
// 图片太大，针对鼠标单击裁剪尺寸
let inputWidth = 150;
let inputHeight = 150;

// 针对鼠标拖动框选花卉
let isDragging = false;
let startX, startY;
const image = document.getElementById('image');
const overlay = document.getElementById('overlayCanvas');
const imageContainer = document.getElementById('imageContainer');

// 开发
let labelUrl = 'https://caihb2017.github.io/aiflower/web_model/savedmodel/label_map.json'
let modelUrl = 'https://caihb2017.github.io/aiflower/web_model/savedmodel/model.json'
// 部署
// let labelUrl = 'web_model/savedmodel/label_map.json'
// let modelUrl = 'web_model/savedmodel/model.json'

let labelEnCnUrl = 'conf/label_encn.json'

// 加载预训练模型
async function loadModel() {
  try {
    // 加载Savedmodel转换模型运行正确，预测错误
    model = await tf.loadGraphModel(modelUrl);
    
    document.getElementById('result').innerText = "Model loaded successfully.";
    
    // console.log("Model input:", model.input)
    // console.log(model.summary())

  } catch (error) {
    console.error("Error loading model:", error);
    document.getElementById('predict').disabled = true;
    document.getElementById('result').innerText = "Error loading model.";
  }
}

// 加载类别标签
async function loadLabelMap(label_map_path, label_encn_path){
  try {
    // 获取标签类别名称
    const responseMap = await fetch(label_map_path);
    labelMap = await responseMap.json();

    const responseEncn = await fetch(label_encn_path);
    leabelEnCn = await responseEncn.json();
    
  } catch (error) {
    console.error("加载类别标签失败:", error);
    document.getElementById('result').innerText = "加载类别标签失败。";
  }
}

// 处理上传的图片
function handleImageUpload(event) {
  // 清空上次识别结果
  document.getElementById('result').innerText = "";
  document.getElementById('promptText').innerText = "";

  // 清除之前的裁剪图片
  const croppedImgElement = document.getElementById('croppedImage');
  croppedImgElement.src = '';
  croppedImgElement.style.display = 'none';

  // 禁用预测按钮
  document.getElementById('predict').disabled = true; 

  // 未确定矩形框
  isSelectRect = false;
  
  // 获取 imgElement
  const imgElement = document.getElementById('image');
  imgElement.style.display = 'none';

  // 清除之前的虚线框
  const overlayCanvas = document.getElementById('overlayCanvas');
  overlayCanvas.style.display = 'none';

  // 加载图片
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imgElement = document.getElementById('image');
    imgElement.src = e.target.result;
    imgElement.style.display = 'block';
    
    // 创建一个临时的 Image 对象来获取原始尺寸
    const tempImg = new Image();
    tempImg.onload = function() {
      // 保存原始图像数据和尺寸
      const canvas = document.createElement('canvas');
      canvas.width = tempImg.naturalWidth;
      canvas.height = tempImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(tempImg, 0, 0);

      imgElement.dataset.originalImage = canvas.toDataURL();
      imgElement.dataset.naturalWidth = tempImg.naturalWidth;
      imgElement.dataset.naturalHeight = tempImg.naturalHeight;

      // 更新 overlayCanvas 尺寸和位置
      const overlayCanvas = document.getElementById('overlayCanvas');
      overlayCanvas.width = tempImg.naturalWidth;
      overlayCanvas.height = tempImg.naturalHeight;
      overlayCanvas.style.display = 'block';

      // 确保 canvas 与 imgElement 对齐
      const imgRect = imgElement.getBoundingClientRect();
      overlayCanvas.style.position = 'absolute';
      overlayCanvas.style.left = `${imgRect.left}px`;
      overlayCanvas.style.top = `${imgRect.top}px`;
      
      // 添加提示文本
      document.getElementById('promptText').innerText = '请拖动鼠标，框选花朵。';
    };

    tempImg.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

// 裁剪并显示图像
function cropImage(cropStartX, cropStartY, cropEndX, cropEndY) {
  const imgElement = document.getElementById('image');
  const originalImageData = imgElement.dataset.originalImage;
  const naturalWidth = parseInt(imgElement.dataset.naturalWidth, 10);
  const naturalHeight = parseInt(imgElement.dataset.naturalHeight, 10);

  // Get the image's bounding rectangle
  const imgRect = imgElement.getBoundingClientRect();

  // Calculate the scaling factors
  const scaleX = naturalWidth / imgElement.width;
  const scaleY = naturalHeight / imgElement.height;

  // Convert displayed coordinates to original image coordinates
  const sx = cropStartX * scaleX;
  const sy = cropStartY * scaleY;
  const ex = cropEndX * scaleX;
  const ey = cropEndY * scaleY;

  const width = ex - sx;
  const height = ey - sy;

  // Ensure the crop area is within image bounds
  const adjustedStartX = Math.max(0, Math.min(sx, naturalWidth - width));
  const adjustedStartY = Math.max(0, Math.min(sy, naturalHeight - height));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas dimensions
  canvas.width = cropEndX - cropStartX;
  canvas.height = cropEndY - cropStartY;

  // Create a temporary image object to load the original image data
  const tempImg = new Image();
  tempImg.onload = function() {
    // Draw the cropped area on the canvas
    ctx.drawImage(tempImg, adjustedStartX, adjustedStartY, width, height, 0, 0, canvas.width, canvas.height);

    const croppedImgElement = document.getElementById('croppedImage');
    croppedImgElement.src = canvas.toDataURL();
    croppedImgElement.style.display = 'block';
  };

  tempImg.src = originalImageData;

  document.getElementById('predict').disabled = false; // 启用预测按钮
  document.getElementById('promptText').innerText = ''

}

// SavedModel模型预测图片
async function predictImage() {
  if (!model) {
    document.getElementById('result').innerText = "模型尚未加载。";
    return;
  }

  if (!isSelectRect) {
    document.getElementById('result').innerText = "请拖动鼠标，框选花朵。";
    return;
  }

  // 获取图像元素
  const imgElement = document.getElementById('croppedImage');
  // 从图像元素创建张量
  const tensorImg = tf.browser.fromPixels(imgElement).toFloat();

  // 调整为模型需要的输入大小
  const resizedImg = tf.image.resizeBilinear(tensorImg, [224, 224]); 
  // 归一化图像
  const normalizedImg = resizedImg.div(255.0);
  // 添加批量维度
  const batchedImg = normalizedImg.expandDims(0);

  // 进行预测
  let predictions;
  try {
    predictions = await model.execute(batchedImg);
  } catch (error) {
    console.error("模型预测失败:", error);
    document.getElementById('result').innerText = "模型预测失败。";
    return;
  }

  // 检查 predictions 是否有效
  if (!predictions || Array.isArray(predictions) && predictions.length === 0) {
    console.error("模型预测返回了无效的输出。");
    document.getElementById('result').innerText = "模型预测返回了无效的输出。";
    return;
  }

  // 获取第一个 Tensor 作为输出
  // 实际不是数组
  const outputTensor = Array.isArray(predictions) ? predictions[0] : predictions;

  if (!outputTensor) {
    console.error("输出 Tensor 未定义");
    document.getElementById('result').innerText = "输出 Tensor 未定义。";
    return;
  }

  // 将 Tensor 转换为数组
  let probabilities;
  try {
    probabilities = await outputTensor.data(); // 使用 .data() 而不是 .array()
    // console.log("probabilities:")
    // console.log(probabilities)
  } catch (error) {
    console.error("Tensor 转换为数组失败:", error);
    document.getElementById('result').innerText = "Tensor 转换为数组失败。";
    return;
  }

  // 获取 top-k 预测
  const topKIndices = Array.from(probabilities)
                             .map((prob, index) => ({prob, index}))
                             .sort((a, b) => b.prob - a.prob)
                             .slice(0, topK)
                             .map(item => item.index);
 
  const topKProbabilities = topKIndices.map(index => probabilities[index]);

  // 显示 top-k 预测结果, label编号从1开始（index+1），不是从0开始
  let resultText = "";
  // topKIndices.forEach((index, i) => {
  //   const className = labelMap[index + 1] || "Unknown"; // 从字典中获取类别名称
  //   const cnName = leabelEnCn[className];
  //   const probability = topKProbabilities[i];
  //   resultText += `${className}-${cnName}: ${probability.toFixed(4)}\n`; // 保留四位小数
  // });

  // top-1的概率大于80%，只输出一个值，小于输出top-3
  top1Prob = topKProbabilities[0];
  const className = labelMap[topKIndices[0] + 1] || "Unknown"; // 从字典中获取类别名称
  const cnName = leabelEnCn[className];
  resultText += `${className}-${cnName}: ${top1Prob.toFixed(4)}\n`; // 保留四位小数

  // top-1小于80%，再补充输出2个预测
  if (top1Prob < 0.8) {
    for (let i = 1; i < 3; i++) {
      const probability = topKProbabilities[i];
      // top-2，top-3 如果小于60%，则不输出
      if (probability >= 0.6) {
        const className = labelMap[topKIndices[0] + 1] || "Unknown"; // 从字典中获取类别名称
        const cnName = leabelEnCn[className];
        resultText += `maybe: ${className}-${cnName}: ${probability.toFixed(4)}\n`; // 保留四位小数    
      }
    }
  }


  document.getElementById('result').innerText = resultText;
  
}

// 鼠标按下事件处理
// 双击事件触发，获取鼠标位置，作为矩形框中心
document.addEventListener('dblclick', (event) => {
  console.log("双击事件触发"); // 检查事件是否被触发
  const imgElement = document.getElementById('image');
  
  if (imgElement) {
    const rect = imgElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const sx = x - inputWidth / 2;
    const sy = y - inputHeight / 2;
    const ex = sx + inputWidth;
    const ey = sy + inputHeight;
    
    // 显示裁剪图片
    cropImage(sx, sy, ex, ey);

    isSelectRect = true;

  } else {
    console.error("未找到图像元素");
  }
});

// 拖动鼠标框选，涉及三个鼠标事件
// 鼠标按下事件
document.addEventListener('pointerdown', (event) => {
  if (event.target.id === 'image') {
    isDragging = true;
    const rect = image.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;

    // 初始化虚线框
    overlay.style.left = `${startX}px`;
    overlay.style.top = `${startY}px`;
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    overlay.style.display = 'block';
  }
});

// 鼠标移动事件处理
document.addEventListener('pointermove', (event) => {
  if (isDragging) {
    const rect = image.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    const width = currentX - startX;
    const height = currentY - startY;

    // 更新虚线框
    overlay.style.left = `${Math.min(startX, currentX)}px`;
    overlay.style.top = `${Math.min(startY, currentY)}px`;
    overlay.style.width = `${Math.abs(width)}px`;
    overlay.style.height = `${Math.abs(height)}px`;
  }
});

// 鼠标释放事件处理
document.addEventListener('pointerup', (event) => {
  if (isDragging) {
    isDragging = false;
    const rect = image.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;

    // 计算裁剪区域的宽度和高度
    const width = endX - startX;
    const height = endY - startY;

    // 调用裁剪函数
    cropImage(startX, startY, endX, endY);

    // 清除虚线框
    overlay.style.display = 'none';

    isSelectRect = true;
  }
});

// 初始化页面
function initialize() {
  // 预测按钮不可用
  document.getElementById('predict').disabled = true;
  // 未确定矩形框
  isSelectRect = false;

  // 事件监听
  // 文件选择事件，处理图片
  document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
  // 单击预测按钮事件
  document.getElementById('predict').addEventListener('click', predictImage);

  
  loadModel(); // 加载模型
  loadLabelMap(labelUrl, labelEnCnUrl);
}

// 当页面加载完成时，调用初始化函数
window.onload = initialize;
