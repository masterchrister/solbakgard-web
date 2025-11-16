// --- Navigasjon for mobil ---
document.addEventListener('DOMContentLoaded', () => {

    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const siteHeader = document.querySelector('.site-header');

    navToggle.addEventListener('click', () => {
        siteHeader.classList.toggle('nav-open');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            siteHeader.classList.remove('nav-open');
        });
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

});

// --- Galleri funksjon ---
document.addEventListener('DOMContentLoaded', () => {

    const lightbox = document.getElementById('lightbox');
    
    if (lightbox) {
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        const lightboxClose = lightbox.querySelector('.lightbox-close');
        const galleryItems = document.querySelectorAll('.gallery-grid a.gallery-item');

        galleryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault(); 
                
                const fullImageUrl = item.getAttribute('href');
                
                const altText = item.querySelector('img').getAttribute('alt');
                
                lightboxImage.setAttribute('src', fullImageUrl);
                lightboxImage.setAttribute('alt', altText);
                
                lightbox.classList.add('visible');
            });
        });

        const closeLightbox = () => {
            lightbox.classList.remove('visible');
            lightboxImage.setAttribute('src', ''); 
        };

        lightboxClose.addEventListener('click', closeLightbox);

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
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

            formStatus.textContent = 'Sender...';
            formStatus.className = 'form-status';
            submitButton.disabled = true;

            try {
                const response = await fetch(contactForm.getAttribute('action'), {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();

                if (response.ok) {
                    formStatus.textContent = result.message;
                    formStatus.classList.add('success');
                    contactForm.reset();
                } else {
                    throw new Error(result.message);
                }

            } catch (error) {
                formStatus.textContent = 'Noe gikk galt. Prøv igjen senere.';
                formStatus.classList.add('error');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

});