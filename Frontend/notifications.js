// ==========================================================
// MindForum — Notifications Controller (Real MongoDB Data)
// ==========================================================

let notificationsList = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.currentUser) {
        await fetchUserData();
    }
    await loadNotifications();
});

async function loadNotifications() {
    const stream = document.getElementById("notificationsStream");
    try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("Failed to load notifications");
        notificationsList = await res.json();

        renderNotifications(notificationsList);
    } catch (err) {
        console.error("Notifications fetch error:", err);
        stream.innerHTML = `<div class="empty-state" style="padding:40px; text-align:center;"><p>Error loading notifications.</p></div>`;
    }
}

function filterNotifications(filter) {
    currentFilter = filter;
    document.querySelectorAll('.notif-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });

    if (filter === 'all') {
        renderNotifications(notificationsList);
    } else if (filter === 'mentions') {
        renderNotifications(notificationsList.filter(n => n.type === 'mention' || n.type === 'message'));
    } else if (filter === 'upvotes') {
        renderNotifications(notificationsList.filter(n => n.type === 'upvote'));
    }
}

function renderNotifications(items) {
    const stream = document.getElementById("notificationsStream");
    if (!items || items.length === 0) {
        stream.innerHTML = `
            <div class="empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px solid #EEE;">
                <i class="far fa-bell-slash" style="font-size:32px; color:#BBB; margin-bottom:12px;"></i>
                <h3 style="font-size:16px; color:#444;">No notifications</h3>
                <p style="font-size:13px; color:#888;">When members interact with your ideas or follow you, updates appear here.</p>
            </div>
        `;
        return;
    }

    stream.innerHTML = "";
    items.forEach(notif => {
        const card = createNotificationElement(notif);
        stream.appendChild(card);
    });
}

function createNotificationElement(n) {
    const card = document.createElement("div");
    card.className = `notif-item-card ${n.isRead ? '' : 'unread'}`;
    const timeAgoStr = formatTimeAgo(new Date(n.createdAt));
    const sender = n.sender || { name: 'Mind Thinker' };
    const senderName = sender.name || 'A community member';
    const initial = senderName.charAt(0).toUpperCase();

    if (n.type === 'upvote') {
        card.innerHTML = `
            <div class="notif-icon-col">
                <div class="notif-circle-icon upvote">
                    <i class="fas fa-thumbs-up"></i>
                </div>
            </div>
            <div class="notif-body-col">
                <div class="notif-top-meta">
                    <p class="notif-headline">
                        <strong>${senderName}</strong> upvoted your insight in 
                        <span class="headline-target" onclick="window.location.href='home.html'">${n.message || 'Discussion'}</span>
                    </p>
                    <span class="notif-time-badge">${timeAgoStr}</span>
                </div>
                <div class="notif-quote-snippet">
                    "${n.snippet || 'The convergence of agency and accountability in non-biological systems suggests we need a new legal framework...'}"
                </div>
            </div>
        `;
    } else if (n.type === 'mention' || n.type === 'message') {
        card.innerHTML = `
            <div class="notif-icon-col">
                <div class="notif-avatar-img" onclick="window.location.href='profile.html?id=${sender._id || ''}'" style="cursor:pointer">
                    ${sender.profilePic ? `<img src="${sender.profilePic}">` : `<div class="avatar-init">${initial}</div>`}
                </div>
            </div>
            <div class="notif-body-col">
                <div class="notif-top-meta">
                    <p class="notif-headline">
                        <strong>${senderName}</strong> mentioned you in a discussion
                    </p>
                    <span class="notif-time-badge">
                        ${timeAgoStr}
                        ${!n.isRead ? '<span class="unread-red-dot"></span>' : ''}
                    </span>
                </div>
                <div class="notif-quote-snippet">
                    "${n.message || 'I think your perspective aligns with our ongoing research. What are your thoughts?'}"
                </div>
                <div class="notif-actions-row">
                    <button class="btn-notif-primary" onclick="replyToNotification('${n._id}', '${sender._id}')">
                        Reply Now
                    </button>
                    <button class="btn-notif-secondary" onclick="window.location.href='home.html'">
                        View Thread
                    </button>
                </div>
            </div>
        `;
    } else if (n.type === 'follow') {
        card.innerHTML = `
            <div class="notif-icon-col">
                <div class="notif-avatar-img" onclick="window.location.href='profile.html?id=${sender._id || ''}'" style="cursor:pointer">
                    ${sender.profilePic ? `<img src="${sender.profilePic}">` : `<div class="avatar-init">${initial}</div>`}
                </div>
                <div class="avatar-badge-follow"><i class="fas fa-plus"></i></div>
            </div>
            <div class="notif-body-col">
                <div class="notif-top-meta">
                    <div>
                        <p class="notif-headline">
                            <strong>${senderName}</strong> followed you.
                        </p>
                        <p class="notif-author-sub">${sender.title || 'Fellow Intellectual Explorer'}</p>
                    </div>
                    <span class="notif-time-badge">${timeAgoStr}</span>
                </div>
                <div class="notif-actions-row">
                    <button class="btn-notif-secondary" onclick="followUserFromNotif('${sender._id}', this)">
                        Follow Back
                    </button>
                </div>
            </div>
        `;
    } else {
        // Answer or general notification
        card.innerHTML = `
            <div class="notif-icon-col">
                <div class="notif-circle-icon answer">
                    <i class="fas fa-comment-dots"></i>
                </div>
            </div>
            <div class="notif-body-col">
                <div class="notif-top-meta">
                    <p class="notif-headline">
                        <strong>${senderName}</strong> answered your inquiry: 
                        <span class="headline-target" onclick="window.location.href='question.html?id=${n.questionId || ''}'">${n.message || 'Question'}</span>
                    </p>
                    <span class="notif-time-badge">${timeAgoStr}</span>
                </div>
                <div class="notif-quote-snippet">
                    ${n.snippet || 'True intellectual progress requires interrogating our assumptions from first principles...'}
                </div>
            </div>
        `;
    }

    card.addEventListener('click', () => markSingleRead(n._id, card));
    return card;
}

async function markSingleRead(notifId, el) {
    try {
        await fetch(`/api/notifications/${notifId}/read`, { method: "PATCH" });
        el.classList.remove('unread');
        const dot = el.querySelector('.unread-red-dot');
        if (dot) dot.remove();
    } catch (err) {
        console.error("Mark read error:", err);
    }
}

async function markAllNotificationsAsRead() {
    try {
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        notificationsList.forEach(n => n.isRead = true);
        renderNotifications(notificationsList);
        const dot = document.getElementById("notifDot");
        if (dot) dot.classList.add("hidden");
    } catch (err) {
        console.error("Mark all error:", err);
    }
}

function replyToNotification(notifId, senderId) {
    if (senderId) {
        window.location.href = `messages.html?userId=${senderId}`;
    } else {
        window.location.href = `messages.html`;
    }
}

async function followUserFromNotif(userId, btn) {
    if (!window.currentUser) {
        alert("Please log in to follow.");
        return;
    }
    try {
        btn.disabled = true;
        const res = await fetch(`/api/user/follow/${userId}`, { method: 'POST' });
        if (res.ok) {
            btn.innerText = "Following";
            btn.style.background = "#EAECEF";
        }
    } catch (err) {
        console.error("Follow error:", err);
    } finally {
        btn.disabled = false;
    }
}

function formatTimeAgo(date) {
    const diffSec = Math.floor((new Date() - date) / 1000);
    if (diffSec < 60) return "JUST NOW";
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min}M AGO`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}H AGO`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}D AGO`;
    const months = Math.floor(days / 30);
    return `${months}MO AGO`;
}
