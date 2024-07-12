function loadContent(page) {
    fetch(`${page}/index.html`)
        .then(response => response.text())
        .then(data => {
            document.getElementById('content').innerHTML = data;
        })
        .catch(error => {
            document.getElementById('content').innerHTML = '<p>加载内容时出错，请稍后再试。</p>';
            console.error('Error loading content:', error);
        });
}

// 初始加载主页内容
document.addEventListener('DOMContentLoaded', () => {
    loadContent('home');
});
