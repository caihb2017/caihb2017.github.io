function loadHandler() {
    fetch('/header.html')
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
        })
        .catch(error => console.error('Error loading header:', error));
        
    fetch('/footer.html')
    .then(response => response.text())
    .then(data => {
        document.body.insertAdjacentHTML('beforeend', data);
    })
    .catch(error => console.error('Error loading footer:', error));
}

window.onload = loadHandler;