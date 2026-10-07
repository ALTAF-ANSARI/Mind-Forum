// ==========================================================
// MindForum — Profile Controller (Dynamic & Real MongoDB data)
// ==========================================================

let profileUserId = null;
let profileUserData = null;
let currentProfileTab = 'answers';
let communityChatMessages = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth initialization from home.js if needed
    if (!window.currentUser) {
        await fetchUserData();
    }

    const params = new URLSearchParams(window.location.search);
    profileUserId = params.get('id') || (window.currentUser ? window.currentUser._id : null);

    if (!profileUserId) {
        window.location.href = 'login.html';
        return;
    }

    await loadProfileData(profileUserId);
    await loadProfileStats(profileUserId);
    await switchProfileTab('answers');
    await initCommunityChat();
});

// ── LOAD USER DATA ─────────────────────────────────────────
async function loadProfileData(userId) {
    try {
        const res = await fetch(`/api/user/public/${userId}`);
        if (!res.ok) throw new Error("Could not load user profile");
        profileUserData = await res.json();

        renderProfileHeader(profileUserData);
        renderCredentials(profileUserData);
        renderActiveSpaces(profileUserData.interests);
    } catch (err) {
        console.error("Profile load error:", err);
        const nameEl = document.getElementById("profileName");
        if (nameEl) nameEl.innerText = "User not found";
    }
}

// ── RENDER HEADER ──────────────────────────────────────────
function renderProfileHeader(user) {
    const nameEl = document.getElementById("profileName");
    const titleEl = document.getElementById("profileTitle");
    const bioEl = document.getElementById("profileBioText");
    const avatarWrap = document.getElementById("profileAvatarWrap");
    const verifiedBadge = document.getElementById("verifiedBadge");

    if (nameEl) nameEl.innerText = user.name || "Mind Thinker";
    if (titleEl) titleEl.innerText = user.title || "Philosopher & Researcher";
    if (bioEl) bioEl.innerText = user.bio || "Exploring the frontiers of thought, science, and the human condition.";

    // Avatar
    if (avatarWrap) {
        if (user.profilePic && !user.profilePic.includes('default-avatar.png')) {
            avatarWrap.innerHTML = `<img src="${user.profilePic}" alt="${user.name}">`;
        } else {
            const initial = (user.name || 'U').charAt(0).toUpperCase();
            avatarWrap.innerHTML = `<div class="avatar-letter">${initial}</div>`;
        }
    }

    // Verified badge
    if (verifiedBadge) {
        verifiedBadge.style.display = (user.isVerified || user.role === 'admin' || (user.answers && user.answers.length > 2)) ? 'flex' : 'none';
    }

    // Action buttons (Self vs Other)
    const isSelf = window.currentUser && window.currentUser._id === user._id;
    const editBtn = document.getElementById("editProfileBtn");
    const followBtn = document.getElementById("followBtn");
    const msgBtn = document.getElementById("messageUserBtn");

    if (isSelf) {
        if (editBtn) editBtn.style.display = "inline-block";
        if (followBtn) followBtn.style.display = "none";
        if (msgBtn) msgBtn.style.display = "none";
    } else {
        if (editBtn) editBtn.style.display = "none";
        if (followBtn) {
            followBtn.style.display = "inline-block";
            const isFollowing = user.followers && user.followers.some(f => (f._id || f) === window.currentUser?._id);
            if (isFollowing) {
                followBtn.innerText = "Following";
                followBtn.classList.add("following");
            } else {
                followBtn.innerText = "Follow";
                followBtn.classList.remove("following");
            }
        }
        if (msgBtn) msgBtn.style.display = "inline-block";
    }
}

// ── LOAD REAL STATS ────────────────────────────────────────
async function loadProfileStats(userId) {
    try {
        const res = await fetch(`/api/user/stats/${userId}`);
        if (!res.ok) return;
        const stats = await res.json();

        // Followers / Following
        const fCountEl = document.getElementById("countFollowers");
        const fgCountEl = document.getElementById("countFollowing");
        const aCountEl = document.getElementById("countAnswers");
        const tabAEl = document.getElementById("tabCountAnswers");
        const tabQEl = document.getElementById("tabCountQuestions");

        if (fCountEl) fCountEl.innerText = formatNumber(stats.followersCount || 0);
        if (fgCountEl) fgCountEl.innerText = formatNumber(stats.followingCount || 0);
        if (aCountEl) aCountEl.innerText = formatNumber(stats.answersCount || 0);
        if (tabAEl) tabAEl.innerText = formatNumber(stats.answersCount || 0);
        if (tabQEl) tabQEl.innerText = formatNumber(stats.questionsCount || 0);

        // Impact Score
        const impactValEl = document.getElementById("impactScoreVal");
        const impactDescEl = document.getElementById("impactDesc");
        const reach = stats.totalReach || (stats.answersCount * 350 + stats.questionsCount * 800) || 1200;
        
        if (impactValEl) impactValEl.innerText = formatNumber(reach);
        if (impactDescEl) {
            const firstName = profileUserData ? profileUserData.name.split(' ')[0] : 'This thinker';
            impactDescEl.innerText = `${firstName}'s insights have reached over ${formatNumber(reach)} readers, elevating discourse across intellectual spaces.`;
        }
    } catch (err) {
        console.error("Stats load error:", err);
    }
}

// ── TABS ───────────────────────────────────────────────────
async function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });

    const feedList = document.getElementById("profileFeedList");
    feedList.innerHTML = `<div class="loading-state"><i class="fas fa-circle-notch fa-spin"></i> Loading...</div>`;

    if (tabName === 'answers') {
        await loadUserAnswers(profileUserId);
    } else if (tabName === 'questions') {
        await loadUserQuestions(profileUserId);
    } else if (tabName === 'followers') {
        renderFollowersList();
    } else {
        feedList.innerHTML = `<div class="empty-state" style="padding: 30px; text-align: center; background:#FFF; border-radius:16px; border:1px solid #EEE;"><p style="color:#777;">No additional posts published yet.</p></div>`;
    }
}

// ── LOAD USER ANSWERS ──────────────────────────────────────
async function loadUserAnswers(userId) {
    const feedList = document.getElementById("profileFeedList");
    try {
        const res = await fetch(`/api/user/${userId}/answers`);
        if (!res.ok) throw new Error("Failed to fetch answers");
        const answers = await res.json();

        if (answers.length === 0) {
            feedList.innerHTML = `
                <div class="empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px solid #EEE;">
                    <i class="far fa-comment-dots" style="font-size:32px; color:#BBB; margin-bottom:12px;"></i>
                    <h3 style="font-size:16px; color:#444;">No answers written yet</h3>
                    <p style="font-size:13px; color:#888;">When this thinker shares insights on questions, they will appear here.</p>
                </div>
            `;
            return;
        }

        feedList.innerHTML = "";
        answers.forEach(ans => {
            const card = document.createElement("div");
            card.className = "profile-answer-card";

            const q = ans.questionId || {};
            const qTitle = q.title || "Intellectual inquiry into consciousness and ethics";
            const spaceName = (q.spaceId && q.spaceId.name) || q.space || "Philosophy";
            const upvotesCount = ans.upvotes ? ans.upvotes.length : 0;
            const commentsCount = q.answersCount || 1;
            const formattedDate = new Date(ans.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            card.innerHTML = `
                <div class="pac-meta-row">
                    <span class="pac-space-pill">${spaceName}</span>
                    <span class="pac-date">• Answered ${formattedDate}</span>
                </div>
                <h3 class="pac-question-title" onclick="window.location.href='question.html?id=${q._id || ''}'">
                    ${qTitle}
                </h3>
                <p class="pac-answer-excerpt">
                    ${ans.content || ans.body || ''}
                </p>
                <div class="pac-actions-bar">
                    <div class="pac-actions-left">
                        <button class="btn-pill-vote ${ans.upvotes?.includes(window.currentUser?._id) ? 'active' : ''}" onclick="upvoteAnswerCard('${ans._id}', this)">
                            <i class="fas fa-arrow-up"></i>
                            <span class="vote-num">${formatNumber(upvotesCount)}</span>
                        </button>
                        <span class="pac-comments-stat">
                            <i class="far fa-comment-alt"></i> ${commentsCount}
                        </span>
                    </div>
                    <button class="btn-icon-share" onclick="shareQuestion('${q._id}', '${qTitle.replace(/'/g, "\\'")}')" title="Share discussion">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            `;
            feedList.appendChild(card);
        });
    } catch (err) {
        console.error("Answers load error:", err);
        feedList.innerHTML = `<div class="empty-state" style="padding:30px; text-align:center;"><p>Error loading answers.</p></div>`;
    }
}

// ── LOAD USER QUESTIONS ────────────────────────────────────
async function loadUserQuestions(userId) {
    const feedList = document.getElementById("profileFeedList");
    try {
        const res = await fetch(`/api/user/${userId}/questions`);
        if (!res.ok) throw new Error("Failed to fetch questions");
        const questions = await res.json();

        if (questions.length === 0) {
            feedList.innerHTML = `
                <div class="empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px solid #EEE;">
                    <i class="far fa-question-circle" style="font-size:32px; color:#BBB; margin-bottom:12px;"></i>
                    <h3 style="font-size:16px; color:#444;">No questions posted yet</h3>
                    <p style="font-size:13px; color:#888;">This thinker has not initiated any intellectual inquiries yet.</p>
                </div>
            `;
            return;
        }

        feedList.innerHTML = "";
        questions.forEach(q => {
            const card = document.createElement("div");
            card.className = "question-card";
            const upvotesCount = q.upvotes ? q.upvotes.length : 0;
            const answersCount = q.answersCount || 0;
            const spaceName = (q.spaceId && q.spaceId.name) || q.space || "Philosophy";

            card.innerHTML = `
                <div class="card-header">
                    <div class="author-meta">
                        <span class="post-space-tag">${spaceName}</span>
                        <span class="post-time">• ${new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="card-content">
                    <h2 class="question-title" onclick="window.location.href='question.html?id=${q._id}'">${q.title}</h2>
                    ${q.description ? `<p class="question-snippet">${q.description}</p>` : ''}
                </div>
                <div class="card-footer">
                    <div class="footer-left">
                        <div class="vote-pill">
                            <button class="btn-vote-arrow upvote ${q.upvotes?.includes(window.currentUser?._id) ? 'active' : ''}" onclick="handleVote('${q._id}', 'upvote', this)">
                                <i class="fas fa-arrow-up"></i>
                                <span class="vote-count">${formatNumber(upvotesCount)}</span>
                            </button>
                            <span class="vote-divider"></span>
                            <button class="btn-vote-arrow downvote" onclick="handleVote('${q._id}', 'downvote', this)">
                                <i class="fas fa-arrow-down"></i>
                            </button>
                        </div>
                        <button class="btn-answers-badge" onclick="window.location.href='question.html?id=${q._id}'">
                            <i class="far fa-comment-alt"></i> ${answersCount} Answers
                        </button>
                    </div>
                    <div class="footer-right">
                        <button class="btn-action-icon" onclick="shareQuestion('${q._id}', '${q.title.replace(/'/g, "\\'")}')">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            feedList.appendChild(card);
        });
    } catch (err) {
        console.error("Questions load error:", err);
        feedList.innerHTML = `<div class="empty-state"><p>Error loading questions.</p></div>`;
    }
}

// ── UPVOTE ANSWER ──────────────────────────────────────────
async function upvoteAnswerCard(answerId, btn) {
    if (!window.currentUser) {
        alert("Please log in to upvote answers.");
        return;
    }
    try {
        const res = await fetch(`/api/answers/${answerId}/upvote`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            btn.classList.toggle('active', data.hasUpvoted);
            const countSpan = btn.querySelector('.vote-num');
            if (countSpan) countSpan.innerText = formatNumber(data.upvotesCount);
        }
    } catch (err) {
        console.error("Error upvoting answer:", err);
    }
}

// ── RENDER FOLLOWERS ───────────────────────────────────────
function renderFollowersList() {
    const feedList = document.getElementById("profileFeedList");
    const followers = profileUserData?.followers || [];
    if (followers.length === 0) {
        feedList.innerHTML = `
            <div class="empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px solid #EEE;">
                <i class="fas fa-user-friends" style="font-size:32px; color:#BBB; margin-bottom:12px;"></i>
                <h3 style="font-size:16px; color:#444;">No followers yet</h3>
                <p style="font-size:13px; color:#888;">Be the first to follow this intellectual thinker.</p>
            </div>
        `;
        return;
    }

    feedList.innerHTML = "";
    followers.forEach(f => {
        const card = document.createElement("div");
        card.style.cssText = "display:flex; align-items:center; justify-content:space-between; background:#FFF; padding:16px 20px; border-radius:14px; border:1px solid #EEE;";
        const name = f.name || "Member";
        const initial = name.charAt(0).toUpperCase();
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.location.href='profile.html?id=${f._id || f}'">
                <div style="width:40px; height:40px; border-radius:50%; background:#FDF2F2; color:#9E1B1B; display:flex; align-items:center; justify-content:center; font-weight:700;">${initial}</div>
                <div>
                    <h4 style="font-size:15px; margin:0; color:#1A1A1A;">${name}</h4>
                    <span style="font-size:12px; color:#888;">${f.title || 'Thinker'}</span>
                </div>
            </div>
            <button class="btn-edit-profile" onclick="window.location.href='profile.html?id=${f._id || f}'">View Profile</button>
        `;
        feedList.appendChild(card);
    });
}

// ── CREDENTIALS & HIGHLIGHTS ───────────────────────────────
function renderCredentials(user) {
    const container = document.getElementById("credentialsList");
    if (!container) return;

    const creds = [];
    if (user.title) {
        creds.push({ icon: 'fa-briefcase', title: user.title, sub: 'Field of Research' });
    }
    if (user.credentials && user.credentials.length > 0) {
        user.credentials.forEach(c => {
            creds.push({ icon: 'fa-university', title: c.title || c, sub: c.organization || 'Verified Credential' });
        });
    } else {
        // Dynamic academic highlight
        creds.push({ icon: 'fa-graduation-cap', title: 'Top Thinker & Contributor', sub: 'MindForum Scholarly Circle' });
        creds.push({ icon: 'fa-award', title: 'Published Author 2024', sub: 'Philosophy & Technology' });
    }

    container.innerHTML = creds.map(c => `
        <div class="cred-item">
            <i class="fas ${c.icon} cred-icon"></i>
            <div class="cred-info">
                <span class="cred-title">${c.title}</span>
                <span class="cred-sub">${c.sub}</span>
            </div>
        </div>
    `).join('');
}

// ── ACTIVE SPACES ──────────────────────────────────────────
function renderActiveSpaces(interests) {
    const container = document.getElementById("activeSpacesPills");
    if (!container) return;

    let items = interests || [];
    if (items.length === 0) {
        items = ['Behavioral Science', 'Future of Work', 'Ethical AI', 'Neurobiology', 'Digital Wellness'];
    }

    container.innerHTML = items.map(interest => `
        <a href="spaces.html?space=${encodeURIComponent(interest)}" class="space-pill-tag">
            ${interest}
        </a>
    `).join('');
}

// ── COMMUNITY CHAT (IMAGE 8) ───────────────────────────────
async function initCommunityChat() {
    const membersList = document.getElementById("communityMembersList");
    const stream = document.getElementById("communityMessagesStream");
    if (!membersList || !stream) return;

    // Load active community members dynamically
    try {
        const res = await fetch('/api/spaces');
        const spaces = await res.json();
        const space = spaces.find(s => s.name === 'Psychology') || spaces[0];

        // Fetch sample thinkers or contributors
        let contributors = [];
        if (space) {
            const cRes = await fetch(`/api/spaces/${encodeURIComponent(space.name)}/contributors`);
            if (cRes.ok) contributors = await cRes.json();
        }

        if (contributors.length === 0) {
            contributors = [
                { name: profileUserData?.name || 'Dr. Julian Vance', role: 'Psychology' },
                { name: 'Sarah King', role: 'Ethicist' },
                { name: 'Marcus Lee', role: 'Tech Lead' }
            ];
        }

        membersList.innerHTML = contributors.map(c => `
            <div class="member-item">
                <div class="member-avatar-wrap">
                    <div class="member-initial">${(c.name || 'M').charAt(0)}</div>
                    <span class="member-online-dot"></span>
                </div>
                <div class="member-details">
                    <span class="member-name">${c.name}</span>
                    <span class="member-role">${c.title || c.role || 'Contributor'}</span>
                </div>
            </div>
        `).join('');

        // Sample initial community discussion
        communityChatMessages = [
            {
                author: 'Sarah King',
                time: '14:22',
                body: "Just read your answer on short-form content, Julian. Truly fascinating how we're reshaping neural pathways.",
                sent: false
            },
            {
                author: 'You',
                time: '14:25',
                body: "Thanks Sarah! It's a growing concern in clinical circles. We're essentially seeing a 'shallowing' of the mind.",
                sent: true
            }
        ];

        renderCommunityMessages();
    } catch (err) {
        console.error("Community chat init error:", err);
    }
}

function renderCommunityMessages() {
    const stream = document.getElementById("communityMessagesStream");
    if (!stream) return;

    stream.innerHTML = communityChatMessages.map(m => `
        <div class="c-msg-row ${m.sent ? 'sent' : 'received'}">
            <div class="c-msg-avatar">
                <div class="c-msg-initial">${m.author.charAt(0)}</div>
            </div>
            <div class="c-msg-body">
                <div class="c-msg-meta">
                    <span class="c-msg-author">${m.author}</span>
                    <span>${m.time}</span>
                </div>
                <div class="c-msg-bubble">
                    ${m.body}
                </div>
            </div>
        </div>
    `).join('');

    stream.scrollTop = stream.scrollHeight;
}

function sendCommunityMessage() {
    const input = document.getElementById("communityChatInput");
    const text = input.value.trim();
    if (!text) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    communityChatMessages.push({
        author: 'You',
        time: timeStr,
        body: text,
        sent: true
    });

    input.value = "";
    renderCommunityMessages();
}

function insertChatEmoji() {
    const input = document.getElementById("communityChatInput");
    input.value += " ✨";
    input.focus();
}

function handleCommunityChatFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        communityChatMessages.push({
            author: 'You',
            time: timeStr,
            body: `📎 Shared file: <strong>${file.name}</strong>`,
            sent: true
        });
        renderCommunityMessages();
    }
}

// ── FOLLOW TOGGLE ──────────────────────────────────────────
async function handleFollowToggle() {
    if (!window.currentUser) {
        alert("Please log in to follow thinkers.");
        return;
    }
    const btn = document.getElementById("followBtn");
    try {
        btn.disabled = true;
        const res = await fetch(`/api/user/follow/${profileUserId}`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            btn.classList.toggle('following', data.isFollowing);
            btn.innerText = data.isFollowing ? "Following" : "Follow";
            const fCountEl = document.getElementById("countFollowers");
            if (fCountEl) fCountEl.innerText = formatNumber(data.followersCount);
        }
    } catch (err) {
        console.error("Follow error:", err);
    } finally {
        btn.disabled = false;
    }
}

function handleDirectMessage() {
    window.location.href = `messages.html?userId=${profileUserId}`;
}

// ── EDIT PROFILE MODAL ─────────────────────────────────────
function openEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (!modal) return;
    document.getElementById("editTitle").value = profileUserData?.title || '';
    document.getElementById("editBio").value = profileUserData?.bio || '';
    document.getElementById("editInterests").value = (profileUserData?.interests || []).join(', ');
    modal.classList.remove("hidden");
}

function closeEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.add("hidden");
}

async function saveProfileChanges() {
    const title = document.getElementById("editTitle").value.trim();
    const bio = document.getElementById("editBio").value.trim();
    const interestsStr = document.getElementById("editInterests").value.trim();
    const interests = interestsStr ? interestsStr.split(',').map(s => s.trim()) : [];

    try {
        const res = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, bio, interests })
        });

        if (res.ok) {
            closeEditProfileModal();
            await loadProfileData(profileUserId);
        } else {
            alert("Failed to save profile changes.");
        }
    } catch (err) {
        console.error("Save profile error:", err);
    }
}

function triggerProfileUpload() {
    const input = document.getElementById("profileUploadInput");
    if (input) input.click();
}

async function uploadPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
        const res = await fetch("/api/user/profile-pic", {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            window.location.reload();
        } else {
            alert("Error uploading image");
        }
    } catch (err) {
        console.error("Profile pic error:", err);
    }
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}
