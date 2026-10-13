/* ==========================================
   Event Crowd Management System
   dashboard.js
========================================== */

console.log("Dashboard Loaded");

/* ==========================
   API URL
========================== */

const API_URL = "http://localhost:5000/api";

/* ==========================
   DOM Elements
========================== */

const username = document.getElementById("username");
const eventsCount = document.getElementById("eventsCount");
const ticketCount = document.getElementById("ticketCount");
const crowdCount = document.getElementById("crowdCount");

const loader = document.getElementById("loader");
const toast = document.getElementById("toast");

const logoutBtn = document.getElementById("logoutBtn");

const activityTable =
document.getElementById("activityTable");

const bookButtons =
document.querySelectorAll(".event-card button");

/* ==========================
   Loader
========================== */

function showLoader() {

    loader.style.display = "flex";

}

function hideLoader() {

    loader.style.display = "none";

}

/* ==========================
   Toast
========================== */

function showToast(message, success = true) {

    toast.style.display = "block";

    toast.innerText = message;

    toast.style.background =
        success ? "#198754" : "#dc3545";

    setTimeout(() => {

        toast.style.display = "none";

    },3000);

}

/* ==========================
   Authentication
========================== */

const token =
localStorage.getItem("token");

if(!token){

    window.location.href="login.html";

}

/* ==========================
   Load User
========================== */

const user =
JSON.parse(localStorage.getItem("user"));

if(user){

    username.innerText =
    user.name;

}

/* ==========================
   Dashboard Statistics
========================== */

async function loadDashboard(){

    showLoader();

    try{

        const response =
        await fetch(
            `${API_URL}/dashboard`,
            {

                headers:{
                    Authorization:
                    `Bearer ${token}`
                }

            }
        );

        if(!response.ok){

            throw new Error("API Error");

        }

        const data =
        await response.json();

        eventsCount.innerText =
        data.totalEvents;

        ticketCount.innerText =
        data.totalTickets;

        crowdCount.innerText =
        data.totalVisitors;

        loadActivity(
            data.activities
        );

    }

    catch(error){

        console.log(error);

        showToast(
            "Unable to load dashboard.",
            false
        );

    }

    finally{

        hideLoader();

    }

}

/* ==========================
   Recent Activity
========================== */

function loadActivity(activity){

    activityTable.innerHTML="";

    if(activity.length===0){

        activityTable.innerHTML=`

        <tr>

        <td colspan="3">

        No Activity Found

        </td>

        </tr>

        `;

        return;

    }

    activity.forEach(item=>{

        activityTable.innerHTML+=`

        <tr>

        <td>${item.event}</td>

        <td>${item.date}</td>

        <td>${item.status}</td>

        </tr>

        `;

    });

}

/* ==========================
   Book Event Buttons
========================== */

bookButtons.forEach(button=>{

button.addEventListener("click",()=>{

showToast("Redirecting...");

setTimeout(()=>{

window.location.href=
"booking.html";

},1000);

});

});

/* ==========================
   Logout
========================== */

logoutBtn.addEventListener("click",(e)=>{

e.preventDefault();

const confirmLogout=
confirm("Do you want to logout?");

if(confirmLogout){

localStorage.removeItem("token");

localStorage.removeItem("user");

showToast("Logout Successful");

setTimeout(()=>{

window.location.href=
"login.html";

},1000);

}

});

/* ==========================
   Online / Offline
========================== */

window.addEventListener("offline",()=>{

showToast(
"Internet Connection Lost",
false
);

});

window.addEventListener("online",()=>{

showToast(
"Internet Connected"
);

});

/* ==========================
   Refresh Dashboard
========================== */

setInterval(()=>{

loadDashboard();

},30000);

/* ==========================
   Page Load
========================== */

window.onload=()=>{

loadDashboard();

};

/* ==========================
   Keyboard Shortcut
========================== */

document.addEventListener("keydown",(e)=>{

if(e.ctrlKey && e.key==="r"){

e.preventDefault();

loadDashboard();

showToast("Dashboard Refreshed");

}

});

/* ==========================
   End
========================== */

console.log("dashboard.js Loaded Successfully");