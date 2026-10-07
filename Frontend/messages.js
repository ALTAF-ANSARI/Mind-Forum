// ==========================================================
// MindForum — Messages Controller (Matches Reference Image 7)
// Real-time Socket.IO + Dynamic MongoDB Chats
// ==========================================================

let socket;
let currentUser = null;
let currentChatId = null;
let currentChatRecipient = null;
let chats = [];
let messagesList = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch current user from /api/user/me
    try {
        const res = await fetch('/api/user/me');
        if (!res.ok) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = await res.json();
    } catch (e) {
        window.location.href = 'login.html';
        return;
    }

    // Set navbar avatar
    const navEl = document.getElementById('navAvatarContainer');
    if (navEl) navEl.innerHTML = renderAvatarHtml(currentUser);

    // 2. Connect to Socket.IO
    socket = io();

    socket.on('connect', () => {
        if (currentChatId) socket.emit('joinChat', currentChatId);
    });

    socket.on('receiveMessage', (message) => {
        if (currentChatId && (message.chatId === currentChatId || message.chatId?._id === currentChatId)) {
            const existing = document.querySelector(`[data-msg-id="${message._id}"]`);
            if (!existing) {
                appendMessageToUI(message);
                scrollToBottom();
            }
        }
        updateChatInSidebar(message);
    });

    // 3. Load user chats from MongoDB
    await fetchChats();

    // 4. Check if redirected from profile with ?userId=
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    if (targetUserId && targetUserId !== currentUser._id) {
        await initiateOrOpenChat(targetUserId);
    }

    // 5. Setup event bindings
    const sendBtn = document.getElementById('sendMessageBtn');
    const msgInput = document.getElementById('messageInput');

    if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
    if (msgInput) {
        msgInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }

    const searchInput = document.getElementById('chatSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderChatSidebar(e.target.value.trim());
        });
    }

    const userSearchInput = document.getElementById('userSearchInput');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', debounce(searchUsers, 300));
    }
});

// ── FETCH CHATS ────────────────────────────────────────────
async function fetchChats() {
    const container = document.getElementById('chatListContainer');
    try {
        const res = await fetch('/api/chat');
        if (!res.ok) throw new Error();
        chats = await res.json();
        renderChatSidebar();

        // If no chat selected and chats exist, open the first one automatically
        if (!currentChatId && chats.length > 0) {
            const firstRecipient = chats[0].participants?.find(p => p._id !== currentUser._id);
            if (firstRecipient) {
                openChat(chats[0]._id, firstRecipient);
            }
        }
    } catch (err) {
        console.error("Fetch chats error:", err);
        if (container) {
            container.innerHTML = `<div class="empty-state" style="padding:24px;text-align:center;"><p style="color:#888;">No conversations yet.</p></div>`;
        }
    }
}

// ── RENDER SIDEBAR CONVERSATIONS (IMAGE 7) ─────────────────
function renderChatSidebar(filter = '') {
    const container = document.getElementById('chatListContainer');
    if (!container) return;

    const lc = filter.toLowerCase();
    const visible = filter
        ? chats.filter(c => {
            const r = c.participants?.find(p => p._id !== currentUser._id);
            return r?.name?.toLowerCase().includes(lc) || r?.title?.toLowerCase().includes(lc);
        })
        : chats;

    if (visible.length === 0) {
        container.innerHTML = `
            <div style="padding: 30px 16px; text-align: center; color: #888; font-size: 13px;">
                <i class="far fa-comments" style="font-size:24px; color:#CCC; margin-bottom:8px; display:block;"></i>
                ${filter ? 'No matching discussions found.' : 'No conversations started yet.'}
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    visible.forEach(chat => {
        const recipient = chat.participants?.find(p => p._id !== currentUser._id);
        if (!recipient) return;

        let snippet = 'Initiate intellectual dialogue...';
        let timeStr = '';
        if (chat.lastMessage) {
            snippet = chat.lastMessage.text || (chat.lastMessage.file ? 'Shared an attachment' : '');
            timeStr = formatChatTime(chat.lastMessage.createdAt);
        } else if (chat.updatedAt) {
            timeStr = formatChatTime(chat.updatedAt);
        }

        const topic = recipient.title || 'Intellectual Discussion';
        const isActive = currentChatId === chat._id;

        const item = document.createElement('div');
        item.className = `conv-item ${isActive ? 'active' : ''}`;
        item.id = `chat-item-${chat._id}`;
        item.onclick = () => openChat(chat._id, recipient);

        const initial = (recipient.name || 'U').charAt(0).toUpperCase();
        const avatarHtml = (recipient.profilePic && !recipient.profilePic.includes('default-avatar.png'))
            ? `<img src="${recipient.profilePic}">`
            : `<div class="conv-letter">${initial}</div>`;

        item.innerHTML = `
            <div class="conv-avatar-col">
                <div class="conv-avatar-img">
                    ${avatarHtml}
                </div>
                <span class="conv-online-dot"></span>
            </div>
            <div class="conv-info-col">
                <div class="conv-row-top">
                    <span class="conv-name">${recipient.name}</span>
                    <span class="conv-time">${timeStr}</span>
                </div>
                <div class="conv-topic">${topic}</div>
                <p class="conv-snippet">${snippet}</p>
            </div>
        `;

        container.appendChild(item);
    });
}

function updateChatInSidebar(message) {
    const idx = chats.findIndex(c => c._id === message.chatId || c._id === message.chatId?._id);
    if (idx !== -1) {
        chats[idx].lastMessage = message;
        chats[idx].updatedAt = message.createdAt || new Date().toISOString();
        chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } else {
        fetchChats();
        return;
    }
    renderChatSidebar(document.getElementById('chatSearchInput')?.value.trim());
}

// ── OPEN CONVERSATION (IMAGE 7) ────────────────────────────
async function openChat(chatId, recipient) {
    currentChatId = chatId;
    currentChatRecipient = recipient;

    socket.emit('joinChat', chatId);

    // Toggle panels
    const noChat = document.getElementById('noChatState');
    const chatContent = document.getElementById('chatContent');
    if (noChat) noChat.classList.add('hidden');
    if (chatContent) chatContent.classList.remove('hidden');

    // Update active highlight
    document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`chat-item-${chatId}`);
    if (activeEl) activeEl.classList.add('active');

    // Header info (Matches Reference Image 7)
    const headerAvatarWrap = document.getElementById('headerAvatarWrap');
    const activeUserName = document.getElementById('activeUserName');
    const activeTopicText = document.getElementById('activeTopicText');
    const msgInput = document.getElementById('messageInput');

    const initial = (recipient.name || 'U').charAt(0).toUpperCase();
    if (headerAvatarWrap) {
        if (recipient.profilePic && !recipient.profilePic.includes('default-avatar.png')) {
            headerAvatarWrap.innerHTML = `<img src="${recipient.profilePic}">`;
        } else {
            headerAvatarWrap.innerHTML = `<div class="header-init">${initial}</div>`;
        }
    }

    const topic = recipient.title || 'QUANTUM MECHANICS RESEARCH';
    if (activeUserName) activeUserName.innerText = recipient.name;
    if (activeTopicText) activeTopicText.innerText = `ACTIVE DISCUSSING ${topic.toUpperCase()}`;
    if (msgInput) msgInput.placeholder = `Share your thoughts on ${recipient.name.split(' ')[0]}'s ideas...`;

    // Load messages from MongoDB
    const feed = document.getElementById('chatHistoryFeed');
    feed.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Loading dialogue...</div>`;

    try {
        const res = await fetch(`/api/chat/${chatId}/messages`);
        messagesList = await res.json();
        renderMessageHistory();
    } catch (err) {
        console.error("Messages load error:", err);
        feed.innerHTML = `<div class="empty-state"><p>Could not load messages.</p></div>`;
    }

    if (msgInput) msgInput.focus();
}

// ── RENDER MESSAGE HISTORY ─────────────────────────────────
function renderMessageHistory() {
    const feed = document.getElementById('chatHistoryFeed');
    feed.innerHTML = '';

    if (messagesList.length === 0) {
        feed.innerHTML = `
            <div style="margin: auto; text-align: center; color: #888;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: #FDF2F2; color: #9E1B1B; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; font-weight: 700; font-size: 18px;">
                    ${(currentChatRecipient?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <h4 style="color:#1A1A1A; margin-bottom:4px;">${currentChatRecipient?.name}</h4>
                <p style="font-size: 13px;">Begin an intellectual exchange with this thinker.</p>
            </div>
        `;
        return;
    }

    // Centered TODAY divider
    const divider = document.createElement('div');
    divider.className = 'date-divider-pill';
    divider.innerText = 'TODAY';
    feed.appendChild(divider);

    messagesList.forEach(msg => {
        appendMessageToUI(msg, feed);
    });

    scrollToBottom();
}

function appendMessageToUI(msg, container) {
    if (!container) container = document.getElementById('chatHistoryFeed');

    const senderId = msg.sender?._id || msg.sender;
    const isMine = senderId === currentUser._id;
    const senderUser = isMine ? currentUser : (currentChatRecipient || msg.sender);

    const row = document.createElement('div');
    row.className = `bubble-row ${isMine ? 'sent' : 'received'}`;
    if (msg._id) row.setAttribute('data-msg-id', msg._id);

    const initial = (senderUser?.name || 'U').charAt(0).toUpperCase();
    const avatarHtml = (!isMine) ? `
        <div class="bubble-avatar">
            ${(senderUser?.profilePic && !senderUser.profilePic.includes('default-avatar.png'))
                ? `<img src="${senderUser.profilePic}">`
                : `<div class="bubble-letter">${initial}</div>`}
        </div>
    ` : '';

    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

    let attachmentHtml = '';
    if (msg.file) {
        const fileName = msg.file.name || 'document_analysis.pdf';
        const fileSize = msg.file.size || '2.4 MB • PDF Document';
        attachmentHtml = `
            <div class="attachment-card" onclick="window.open('${msg.file.url || '#'}', '_blank')">
                <div class="attachment-icon-box">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="attachment-meta">
                    <span class="attachment-name">${fileName}</span>
                    <span class="attachment-size">${fileSize}</span>
                </div>
                <i class="fas fa-download attachment-dl-btn"></i>
            </div>
        `;
    }

    row.innerHTML = `
        ${avatarHtml}
        <div class="bubble-body-col">
            ${msg.text ? `<div class="msg-bubble-content">${escapeHtml(msg.text)}</div>` : ''}
            ${attachmentHtml}
            <span class="msg-time-stamp">${timeStr}</span>
        </div>
    `;

    container.appendChild(row);
}

// ── SEND MESSAGE ───────────────────────────────────────────
function sendChatMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text || !currentChatId) return;

    // Optimistic UI append
    const tempMsg = {
        chatId: currentChatId,
        sender: { _id: currentUser._id, name: currentUser.name, profilePic: currentUser.profilePic },
        text: text,
        createdAt: new Date().toISOString()
    };
    appendMessageToUI(tempMsg);
    scrollToBottom();

    input.value = '';

    // Emit over socket (handled on backend server to persist to MongoDB)
    socket.emit('sendMessage', {
        chatId: currentChatId,
        senderId: currentUser._id,
        text: text
    });
}

function handleFileAttachment(event) {
    const file = event.target.files[0];
    if (!file || !currentChatId) return;

    const tempMsg = {
        chatId: currentChatId,
        sender: { _id: currentUser._id, name: currentUser.name, profilePic: currentUser.profilePic },
        text: `Shared an intellectual document: ${file.name}`,
        file: {
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB • Attachment`,
            url: '#'
        },
        createdAt: new Date().toISOString()
    };
    appendMessageToUI(tempMsg);
    scrollToBottom();

    socket.emit('sendMessage', {
        chatId: currentChatId,
        senderId: currentUser._id,
        text: `Shared file: ${file.name}`
    });
}

// ── INITIATE OR OPEN CHAT ──────────────────────────────────
async function initiateOrOpenChat(recipientId) {
    try {
        const res = await fetch('/api/chat/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId })
        });
        if (!res.ok) throw new Error();
        const chat = await res.json();
        await fetchChats();
        const found = chats.find(c => c._id === chat._id);
        if (found) {
            const r = found.participants.find(p => p._id !== currentUser._id);
            if (r) openChat(found._id, r);
        }
    } catch (err) {
        console.error('initiateOrOpenChat error:', err);
    }
}

// ── NEW CHAT SEARCH MODAL ──────────────────────────────────
function openNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) {
        modal.classList.remove('hidden');
        const input = document.getElementById('userSearchInput');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function closeNewChatModal() {
    const modal = document.getElementById('newChatModal');
    if (modal) modal.classList.add('hidden');
}

async function searchUsers() {
    const q = document.getElementById('userSearchInput').value.trim();
    const resultsEl = document.getElementById('userSearchResults');

    if (q.length < 2) {
        resultsEl.innerHTML = '<p class="search-hint" style="color:#888; font-size:13px; text-align:center; padding:20px;">Type at least 2 characters to discover thinkers...</p>';
        return;
    }

    resultsEl.innerHTML = '<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>';

    try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const users = await res.json();

        if (!Array.isArray(users) || users.length === 0) {
            resultsEl.innerHTML = '<p class="search-hint" style="color:#888; font-size:13px; text-align:center; padding:20px;">No thinkers found matching your query.</p>';
            return;
        }

        resultsEl.innerHTML = '';
        users.forEach(user => {
            if (user._id === currentUser._id) return;
            const item = document.createElement('div');
            item.style.cssText = "display:flex; align-items:center; justify-content:space-between; padding:10px 14px; border-bottom:1px solid #EEE; cursor:pointer;";
            const initial = (user.name || 'U').charAt(0).toUpperCase();

            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:50%; background:#FDF2F2; color:#9E1B1B; display:flex; align-items:center; justify-content:center; font-weight:700;">${initial}</div>
                    <div>
                        <strong style="font-size:14px; color:#1A1A1A;">${user.name}</strong>
                        <div style="font-size:12px; color:#888;">${user.title || 'Thinker'}</div>
                    </div>
                </div>
                <button class="btn-notif-primary" onclick="startChatWithUser('${user._id}')">
                    Message
                </button>
            `;
            resultsEl.appendChild(item);
        });
    } catch (_) {
        resultsEl.innerHTML = '<p class="search-hint">Search failed. Please try again.</p>';
    }
}

async function startChatWithUser(userId) {
    closeNewChatModal();
    await initiateOrOpenChat(userId);
}

function viewChatProfile() {
    if (currentChatRecipient?._id) {
        window.location.href = `profile.html?id=${currentChatRecipient._id}`;
    }
}

// ── UTILITIES ──────────────────────────────────────────────
function scrollToBottom() {
    const feed = document.getElementById('chatHistoryFeed');
    if (feed) setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 60);
}

function renderAvatarHtml(user) {
    const initial = (user?.name || 'U').charAt(0).toUpperCase();
    if (user?.profilePic && !user.profilePic.includes('default-avatar.png')) {
        return `<img src="${user.profilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    return `<div class="avatar-letter">${initial}</div>`;
}

function formatChatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diffSec = Math.floor((new Date() - date) / 1000);
    if (diffSec < 60) return 'JUST NOW';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min}M AGO`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}H AGO`;
    return 'YESTERDAY';
}

function escapeHtml(str = '') {
    return String(str).replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
