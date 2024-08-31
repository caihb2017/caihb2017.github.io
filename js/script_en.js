function loadHandler() {
    fetch('/header_en.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
            document.getElementById("toggleLang").addEventListener("click", toggleLang);
        })
        .catch(error => console.error('Error loading header:', error));
        
    fetch('/footer_en.html')
    .then(response => response.text())
    .then(data => {
        document.body.insertAdjacentHTML('beforeend', data);
    })
    .catch(error => console.error('Error loading footer:', error));
}

function toggleLang() {
    const currentUrl = window.location.href;
    const newUrl = currentUrl.replace("index_en.html", "index.html");
    window.location.href = newUrl;
}

window.onload = loadHandler;