document.addEventListener("DOMContentLoaded", () => {
    
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('logged') || urlParams.get('welcome') === 'true') {
        const cleanUrl = window.location.href.split('?')[0];
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Recarrega apenas se for absolutamente necessário
        location.reload();
    }
    
    const userDropdown = document.querySelector("#userDropdown");

    if (userDropdown) {
        userDropdown.addEventListener("click", () => {
            userDropdown.classList.toggle("active");
        });

        // Fecha o menu se clicar fora
        document.addEventListener("click", (event) => {
            if (!userDropdown.contains(event.target)) {
                userDropdown.classList.remove("active");
            }
        });
    }
        
})
