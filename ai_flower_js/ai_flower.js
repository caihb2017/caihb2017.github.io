// app.js

let model;

// 加载预训练模型
async function loadModel() {
  try {
    // 加载h5转换模型有错
    // model = await tf.loadLayersModel('https://caihb2017.github.io/web_model/h5/model.json');

    // 加载Savedmodel转换模型运行正确，预测错误
    model = await tf.loadGraphModel('https://caihb2017.github.io/web_model/savedmodel/model.json');
    
    document.getElementById('predict').disabled = false; // 启用预测按钮
    document.getElementById('result').innerText = "Model loaded successfully.";
    
    // for SavedModel debug 
    // 查看模型的输入输出节点
    // console.log("Model inputs:");
    // model.inputs.forEach(input => {
    //   console.log(`- ${input.name} (${input.shape})`);
    // });

    // console.log("Model outputs:");
    // model.outputs.forEach(output => {
    //   console.log(`- ${output.name} (${output.shape})`);
    // });

    // for h5 debug
    // model.inputs.forEach(input => {
    //   console.log('Input shape:', input.shape);
    // });

    // console.log("Model input:", model.input)
    // console.log(model.summary())

  } catch (error) {
    console.error("Error loading model:", error);
    document.getElementById('predict').disabled = true;
    document.getElementById('result').innerText = "Error loading model.";
  }
}

// 处理上传的图片
function handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const imgElement = document.getElementById('image');
    imgElement.src = e.target.result;
    imgElement.style.display = 'block';
  };
  
  reader.readAsDataURL(file);
}

// 加载类别标签
function loadLabelMap(label_path){
  let labelMap = {};
  try {
    const response = fetch(label_path);
    labelMap = response.json();
  } catch (error) {
    console.error("加载类别标签失败:", error);
    document.getElementById('result').innerText = "加载类别标签失败。";
    return;
  }
}

// H5模型预测图片
async function predictImage_h5() {
  if (!model) {
    document.getElementById('result').innerText = "模型尚未加载。";
    return;
  }

  const imgElement = document.getElementById('image');
  const tensorImg = tf.browser.fromPixels(imgElement).toFloat();
  // 调整为模型需要的输入大小
  const resizedImg = tf.image.resizeBilinear(tensorImg, [224, 224]); 
  
  const normalizedImg = resizedImg.div(255.0);

  // 转为灰度图像并保持通道维度
  // const grayscaleImg = resizedImg.mean(-1, true); // 转为灰度图像并保持通道维度
  // const normalizedImg = grayscaleImg.div(255.0);

  // 展平并扩展维度
  // (224, 224, 3) 展平为 (224 * 224 * 3)
  // const flattenedImg = normalizedImg.flatten(); // 展平为一维数据
  // const batchedImg = flattenedImg.expandDims(0); // 扩展为 [1, 150528] 的批量数据

  // 添加批量维度
  const batchedImg = normalizedImg.expandDims(0);

  // 进行预测
  const predictions = await model.predict(batchedImg).array();

  // 处理预测结果
  const probabilities = tf.softmax(predictions[0]); // 应用 softmax
  const arr = await probabilities.array();

  // 获取 top-k 预测
  const topK = 5; // 获取前 5 个预测
  const topKIndices = Array.from(arr)
                            .map((prob, index) => ({prob, index}))
                            .sort((a, b) => b.prob - a.prob)
                            .slice(0, topK)
                            .map(item => item.index);
                            
  const topKProbabilities = topKIndices.map(index => arr[index]);

  // 显示 top-k 预测结果
  let resultText = "";
  topKIndices.forEach((index, i) => {
    const className = labelMap[index] || "Unknown"; // 从字典中获取类别名称
    const probability = topKProbabilities[i];
    resultText += `${className}: ${probability.toFixed(4)}\n`; // 保留四位小数
  });
  document.getElementById('result').innerText = resultText;
}

// SavedModel模型预测图片
async function predictImage() {
  if (!model) {
    document.getElementById('result').innerText = "模型尚未加载。";
    return;
  }

  // 加载类别标签
  let labelMap = {};
  try {
    const response = await fetch('label_map-en.json');
    labelMap = await response.json();
  } catch (error) {
    console.error("加载类别标签失败:", error);
    document.getElementById('result').innerText = "加载类别标签失败。";
    return;
  }

  // 获取图像元素
  const imgElement = document.getElementById('image');
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

  // 输出预测结果
  // console.log("Predictions:", predictions);

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
  const topK = 5;
  const topKIndices = Array.from(probabilities)
                             .map((prob, index) => ({prob, index}))
                             .sort((a, b) => b.prob - a.prob)
                             .slice(0, topK)
                             .map(item => item.index);
 
  const topKProbabilities = topKIndices.map(index => probabilities[index]);

  console.log(topKIndices)
  console.log(topKProbabilities)

  // 显示 top-k 预测结果
  let resultText = "";
  topKIndices.forEach((index, i) => {
    const className = labelMap[index] || "Unknown"; // 从字典中获取类别名称
    const probability = topKProbabilities[i];
    resultText += `${className}: ${probability.toFixed(4)}\n`; // 保留四位小数
  });

  document.getElementById('result').innerText = resultText;
  
}

// 初始化页面
function initialize() {
  document.getElementById('predict').disabled = true; // 初始时禁用预测按钮
  document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
  document.getElementById('predict').addEventListener('click', predictImage);

  loadModel(); // 加载模型
  
  loadLabelMap('label_map-cn.json');
}

// 当页面加载完成时，调用初始化函数
window.onload = initialize;
