document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Navigation Toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    const siteHeader = document.querySelector('.site-header');

    navToggle.addEventListener('click', () => {
        // Toggle 'nav-open' class on the header
        siteHeader.classList.toggle('nav-open');
    });

    // Close mobile nav when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            siteHeader.classList.remove('nav-open');
        });
    });


    // --- Active Nav Link Highlighting on Scroll ---
    const sections = document.querySelectorAll('.section');
    const navLi = document.querySelectorAll('.main-nav a.nav-link');

    // Set up the Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Find the corresponding nav link
                const id = entry.target.getAttribute('id');
                const correspondingLink = document.querySelector(`.nav-link[href="#${id}"]`);

                // Remove 'active' from all links
                navLi.forEach(link => link.classList.remove('active'));
                
                // Add 'active' to the intersecting link
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    }, { 
        rootMargin: '-50% 0px -50% 0px' // Triggers in the middle of the viewport
    });

    // Observe each section
    sections.forEach(section => {
        observer.observe(section);
    });

});
document.addEventListener('DOMContentLoaded', () => {

    // --- Lightbox-funksjonalitet ---
    const lightbox = document.getElementById('lightbox');
    
    // Sjekk om lightbox-elementet finnes før vi legger til logikk
    if (lightbox) {
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        const lightboxClose = lightbox.querySelector('.lightbox-close');
        const galleryItems = document.querySelectorAll('.gallery-grid a.gallery-item');

        galleryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 1. Forhindre at lenken åpner bildet i en ny fane
                e.preventDefault(); 
                
                // 2. Hent lenken til det store bildet (fra href)
                const fullImageUrl = item.getAttribute('href');
                
                // 3. Hent alt-teksten fra miniatyrbildet (for tilgjengelighet)
                const altText = item.querySelector('img').getAttribute('alt');
                
                // 4. Oppdater lightbox-bildet
                lightboxImage.setAttribute('src', fullImageUrl);
                lightboxImage.setAttribute('alt', altText);
                
                // 5. Vis lightboxen
                lightbox.classList.add('visible');
            });
        });

        // Funksjon for å lukke lightboxen
        const closeLightbox = () => {
            lightbox.classList.remove('visible');
            // Valgfritt: Fjern src for å stoppe video/gif-avspilling
            lightboxImage.setAttribute('src', ''); 
        };

        // 6. Lukk ved å klikke på (X)
        lightboxClose.addEventListener('click', closeLightbox);

        // 7. Lukk ved å klikke på bakgrunnen (men ikke på selve bildet)
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });
    }

});