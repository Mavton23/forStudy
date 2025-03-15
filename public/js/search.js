document.addEventListener("DOMContentLoaded", () => {
    // Header
    window.addEventListener("scroll", () => {
        if (this.scrollY > 60) {
            document.querySelector(".header").classList.add("sticky")
        } else {
            document.querySelector(".header").classList.remove("sticky")
        }
    })
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".history").style.display="none";
    
        setTimeout(() => {
            location.reload();
        }, 200)
    })

    document.querySelector(".show-history").addEventListener("click", () => {
        document.querySelector(".history").style.display="block";
    })

    // Theme
    const themeToggleButton = document.getElementById('theme-btn');
    const themeIcon = document.getElementById('theme-icon');

    // Recupera o tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme');

    // Função para sincronizar o ícone com o tema
    const updateThemeIcon = (isDarkTheme) => {
        if (isDarkTheme) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        } else {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    };

    // Configura o tema inicial baseado no localStorage
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }

    // Alterna entre temas ao clicar no botão
    themeToggleButton.addEventListener('click', () => {
        const isDarkTheme = document.body.classList.toggle('dark-theme');
        updateThemeIcon(isDarkTheme);

        // Salva o estado do tema no localStorage
        localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    });
})