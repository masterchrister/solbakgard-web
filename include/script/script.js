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
    const navLi = document.querySelectorAll('.main-nav .nav-links li a');

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