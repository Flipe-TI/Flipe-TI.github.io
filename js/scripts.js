/*!
    * Start Bootstrap - Resume v6.0.2 (https://startbootstrap.com/theme/resume)
    * Copyright 2013-2020 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-resume/blob/master/LICENSE)
    */
(function ($) {
    "use strict"; // Start of use strict

    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out-quart',
            once: false,
            mirror: true,
            offset: 100
        });
    }

    // Smooth scrolling using jQuery easing
    $('a.js-scroll-trigger[href*="#"]:not([href="#"])').click(function () {
        if (
            location.pathname.replace(/^\//, "") ==
                this.pathname.replace(/^\//, "") &&
            location.hostname == this.hostname
        ) {
            var target = $(this.hash);
            target = target.length
                ? target
                : $("[name=" + this.hash.slice(1) + "]");
            if (target.length) {
                $("html, body").animate(
                    {
                        scrollTop: target.offset().top - 50,
                    },
                    1000,
                    "easeInOutExpo"
                );
                return false;
            }
        }
    });

    // Closes responsive menu when a scroll trigger link is clicked
    $(".js-scroll-trigger").click(function () {
        $(".navbar-collapse").collapse("hide");
    });

    // Activate scrollspy to add active class to navbar items on scroll
    $("body").scrollspy({
        target: "#sideNav",
        offset: 80
    });

    // Contact Form Handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Get form values
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');

            // Validate form
            if (!name || !email || !subject || !message) {
                showFormMessage('Por favor, preencha todos os campos!', 'danger');
                return;
            }

            // Validate email
            if (!isValidEmail(email)) {
                showFormMessage('Por favor, insira um email válido!', 'danger');
                return;
            }

            // Send email using Formspree (free service)
            fetch('https://formspree.io/f/xanzlwby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    subject: subject,
                    message: message,
                    _subject: 'Novo contato de: ' + name
                })
            })
            .then(response => {
                if (response.ok) {
                    showFormMessage('✓ Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
                    contactForm.reset();
                } else {
                    showFormMessage('Erro ao enviar mensagem. Tente novamente ou contate pelo email.', 'danger');
                }
            })
            .catch(error => {
                console.error('Erro:', error);
                showFormMessage('Erro ao enviar mensagem. Tente novamente.', 'danger');
            });
        });
    }

    // Helper function to validate email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Helper function to show form messages
    function showFormMessage(message, type) {
        const messageDiv = document.getElementById('formMessage');
        if (messageDiv) {
            messageDiv.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>`;
            
            // Auto-remove message after 5 seconds
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 5000);
        }
    }

    // Add scroll event listener for navbar styling on scroll
    $(window).scroll(function () {
        const scrollDistance = $(window).scrollTop();
        if (scrollDistance > 50) {
            $('#sideNav').css('box-shadow', '0 0.5rem 1rem rgba(0, 0, 0, 0.15)');
        } else {
            $('#sideNav').css('box-shadow', 'none');
        }
    });

    // Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

})(jQuery); // End of use strict
