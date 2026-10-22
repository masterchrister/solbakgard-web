// --- Navigasjon for mobil ---
document.addEventListener('DOMContentLoaded', () => {

    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const siteHeader = document.querySelector('.site-header');

    const setNavOpen = (open) => {
        siteHeader.classList.toggle('nav-open', open);
        navToggle.setAttribute('aria-expanded', String(open));
        navToggle.setAttribute('aria-label', open ? 'Lukk navigasjon' : 'Åpne navigasjon');
    };

    navToggle.addEventListener('click', () => {
        setNavOpen(!siteHeader.classList.contains('nav-open'));
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            setNavOpen(false);
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && siteHeader.classList.contains('nav-open')) {
            setNavOpen(false);
            navToggle.focus();
        }
    });

    const sections = document.querySelectorAll('.section');
    const navLi = document.querySelectorAll('.main-nav a.nav-link');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                const correspondingLink = document.querySelector(`.nav-link[href="#${id}"]`);

                navLi.forEach(link => link.classList.remove('active'));
                
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    }, { 
        rootMargin: '-50% 0px -50% 0px'
    });

    sections.forEach(section => {
        observer.observe(section);
    });

    const year = document.getElementById('year');
    if (year) {
        year.textContent = new Date().getFullYear();
    }

});

// --- Galleri funksjon ---
document.addEventListener('DOMContentLoaded', () => {

    const lightbox = document.getElementById('lightbox');
    
    if (lightbox) {
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        const lightboxClose = lightbox.querySelector('.lightbox-close');
        const galleryItems = document.querySelectorAll('.gallery-grid a.gallery-item');
        let lastTrigger = null;

        galleryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();

                const fullImageUrl = item.getAttribute('href');

                const altText = item.querySelector('img').getAttribute('alt');

                lightboxImage.setAttribute('src', fullImageUrl);
                lightboxImage.setAttribute('alt', altText);

                lastTrigger = item;
                lightbox.classList.add('visible');
                lightboxClose.focus();
            });
        });

        const closeLightbox = () => {
            lightbox.classList.remove('visible');
            lightboxImage.removeAttribute('src');
            if (lastTrigger) {
                lastTrigger.focus();
            }
        };

        lightboxClose.addEventListener('click', closeLightbox);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('visible')) return;

            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'Tab') {
                // Lukkeknappen er eneste fokuserbare element i dialogen
                e.preventDefault();
                lightboxClose.focus();
            }
        });
    }

});

// --- Kontaktskjema ---
document.addEventListener('DOMContentLoaded', () => {

    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const formData = new FormData(contactForm);

            if (!formData.get('cf-turnstile-response')) {
                formStatus.textContent = 'Vent til sikkerhetssjekken er fullført.';
                formStatus.className = 'form-status error';
                return;
            }

            formStatus.textContent = 'Sender...';
            formStatus.className = 'form-status';
            submitButton.disabled = true;

            try {
                const response = await fetch(contactForm.getAttribute('action'), {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json().catch(() => ({}));

                if (response.ok) {
                    formStatus.textContent = result.message;
                    formStatus.classList.add('success');
                    contactForm.reset();
                } else {
                    formStatus.textContent = result.message || 'Noe gikk galt. Prøv igjen senere.';
                    formStatus.classList.add('error');
                }

            } catch (error) {
                formStatus.textContent = 'Noe gikk galt. Prøv igjen senere.';
                formStatus.classList.add('error');
            } finally {
                submitButton.disabled = false;
                // Turnstile-tokens kan kun brukes én gang
                if (window.turnstile) {
                    window.turnstile.reset(contactForm.querySelector('.cf-turnstile'));
                }
            }
        });
    }

});