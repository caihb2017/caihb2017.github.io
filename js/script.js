function loadHandler() {
    fetch('/header.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
            document.getElementById("toggleLang").addEventListener("click", toggleLang);
        })
        .catch(error => console.error('Error loading header:', error));
        
    fetch('/footer.html')
    .then(response => response.text())
    .then(data => {
        document.body.insertAdjacentHTML('beforeend', data);
    })
    .catch(error => console.error('Error loading footer:', error));
}

function toggleLang() {
    let currentUrl = window.location.href;
    if(!currentUrl.endsWith(".html")) {
        currentUrl += "index.html";
    }
    if (currentUrl.endsWith("index.html")) {
        const newUrl = currentUrl.replace("index.html", "index_en.html");
        window.location.href = newUrl;
    }
}

window.onload = loadHandler;