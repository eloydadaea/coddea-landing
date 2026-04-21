document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. Animación inicial del Hero (Entrada)
    // ==========================================
    const heroContent = document.querySelector('.hero-content');
    const heroImage = document.querySelector('.hero-image');

    if (heroContent && heroImage) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';
        heroContent.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';

        heroImage.style.opacity = '0';
        heroImage.style.transform = 'translateX(30px)';
        heroImage.style.transition = 'opacity 0.8s ease-out 0.3s, transform 0.8s ease-out 0.3s';

        setTimeout(() => {
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
            heroImage.style.opacity = '1';
            heroImage.style.transform = 'translateX(0)';
        }, 100);
    }

    // ==========================================
    // 2. Animación al hacer Scroll (Tarjetas)
    // ==========================================
    const reveals = document.querySelectorAll('.reveal');
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    reveals.forEach(reveal => {
        revealOnScroll.observe(reveal);
    });

    // ==========================================
    // 3. Menú Inteligente (Scrollspy)
    // ==========================================
    const menuLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('section[id]'); 

    const scrollSpyOptions = { threshold: 0.5 };

    const scrollSpyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const currentId = entry.target.getAttribute('id');
                menuLinks.forEach(link => link.classList.remove('active'));
                const activeLink = document.querySelector(`nav a[href="#${currentId}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        });
    }, scrollSpyOptions);

    sections.forEach(section => scrollSpyObserver.observe(section));

    // ==========================================
    // 4. Lógica del Formulario de Contacto
    // ==========================================
    const contactForm = document.getElementById('lead-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('.submit-btn');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;

            const formData = {
                nombre: document.getElementById('nombre').value,
                empresa: document.getElementById('empresa').value,
                correo: document.getElementById('correo').value,
                telefono: document.getElementById('telefono').value,
                mensaje: document.getElementById('mensaje').value,

                "cf-turnstile-response": document.querySelector('[name="cf-turnstile-response"]').value


            };

            try {
                const response = await fetch('/api/capture-lead', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();
                formStatus.style.display = 'block';
                
                if (response.ok) {
                    formStatus.className = 'form-status success';
                    formStatus.textContent = result.message || '¡Mensaje enviado con éxito!';
                    contactForm.reset();
                } else {
                    formStatus.className = 'form-status error';
                    formStatus.textContent = result.error || 'Ocurrió un error al enviar.';
                }
            } catch (error) {
                formStatus.style.display = 'block';
                formStatus.className = 'form-status error';
                formStatus.textContent = 'Error de conexión. Intenta de nuevo.';
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                setTimeout(() => { formStatus.style.display = 'none'; }, 5000);
            }
        });
    }

    // ==========================================
    // 5. Gestión del Banner de Cookies (CORREGIDO)
    // ==========================================
    const cookieBanner = document.getElementById('cookie-banner');
    
    // 1. Comprobamos si ya aceptó al cargar
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        if (cookieBanner) cookieBanner.style.display = 'none';
    } else {
        if (cookieBanner) cookieBanner.style.display = 'flex';
    }

    // 2. Buscamos el botón dentro del banner y le asignamos el evento
    if (cookieBanner) {
        const acceptBtn = cookieBanner.querySelector('button');
        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                localStorage.setItem('cookiesAccepted', 'true');
                cookieBanner.style.display = 'none';
            });
        }
    }
});