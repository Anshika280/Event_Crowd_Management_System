/* ============================================
   Event Crowd Management System
   index.js
============================================ */

console.log("Event Crowd Management System Landing Page Loaded");

/* ============================================
   API Base URL
============================================ */

const API_URL = "/api";

/* ============================================
   Counter Animation
============================================ */

function animateCounter(id, target, speed = 30) {
    const element = document.getElementById(id);
    if (!element) return;
    if (target === 0) {
        element.innerText = 0;
        return;
    }

    let count = 0;
    const increment = Math.max(1, Math.ceil(target / 50));

    const timer = setInterval(() => {
        count += increment;
        if (count >= target) {
            element.innerText = target;
            clearInterval(timer);
        } else {
            element.innerText = count;
        }
    }, speed);
}

/* ============================================
   Fetch Live Statistics from Backend
============================================ */

async function loadStatistics() {
    try {
        const response = await fetch(`${API_URL}/analytics/live-status`);
        if (response.ok) {
            const data = await response.json();
            if (data.summary) {
                animateCounter("eventsCount", data.summary.totalEvents || 0);
                animateCounter("usersCount", data.summary.totalUsers || 0);
                animateCounter("ticketsCount", data.summary.totalRegistrations || 0);
                return;
            }
        }
    } catch (error) {
        console.log("Stats API offline, fallback to defaults");
    }

    // Fallback static counters if server un-seeded
    animateCounter("eventsCount", 12);
    animateCounter("usersCount", 450);
    animateCounter("ticketsCount", 1200);
}

window.addEventListener("load", () => {
    loadStatistics();
});

/* ============================================
   Contact Form Validation
============================================ */

const contactForm = document.querySelector(".contact form");

if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const inputs = contactForm.querySelectorAll("input");
        const textarea = contactForm.querySelector("textarea");

        const name = inputs[0].value.trim();
        const email = inputs[1].value.trim();
        const message = textarea.value.trim();

        if (name === "" || email === "" || message === "") {
            alert("Please fill all fields.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            alert("Invalid Email Address");
            return;
        }

        alert("Message Sent Successfully! Our team will contact you shortly.");
        contactForm.reset();
    });
}

/* ============================================
   Smooth Scroll
============================================ */

const links = document.querySelectorAll('a[href^="#"]');

links.forEach(link => {
    link.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;

        const section = document.querySelector(targetId);
        if (section) {
            e.preventDefault();
            section.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
});

/* ============================================
   Highlight Active Navigation
============================================ */

window.addEventListener("scroll", () => {
    let current = "";
    document.querySelectorAll("section").forEach(section => {
        const sectionTop = section.offsetTop - 150;
        if ((window.pageYOffset || window.scrollY) >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === "#" + current) {
            link.classList.add("active");
        }
    });
});

/* ============================================
   Notification Popup
============================================ */

function showNotification(message) {
    const div = document.createElement("div");
    div.innerText = message;
    div.style.position = "fixed";
    div.style.right = "20px";
    div.style.top = "20px";
    div.style.padding = "15px";
    div.style.background = "#0b5ed7";
    div.style.color = "white";
    div.style.borderRadius = "8px";
    div.style.zIndex = "9999";
    div.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";

    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 3000);
}

window.addEventListener("offline", () => {
    showNotification("Internet Connection Lost");
});

window.addEventListener("online", () => {
    showNotification("Connected Successfully");
});