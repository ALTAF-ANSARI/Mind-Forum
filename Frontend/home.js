let currentUser = null;
let currentSpace = "All";
let searchQuery = "";

window.onload = async () => {
    initTheme();
    await fetchUserData();
    await loadQuestions();
    await loadSidebarSpaces();
    initGlobalEvents();
};

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
        themeToggle.checked = savedTheme === "dark";
        themeToggle.onchange = (e) => setTheme(e.target.checked ? "dark" : "light");
    }
}

function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}

function initGlobalEvents() {
    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("profileDropdown");
        const trigger = document.getElementById("profileTrigger");
        if (dropdown && trigger && !trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });

    // Check notification badge
    checkNotifications();
    setInterval(checkNotifications, 30000);
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) dropdown.classList.toggle("active");
}

async function fetchUserData() {
    try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
            currentUser = await response.json();
            
            // Render Nav Avatar
            const trigger = document.getElementById("profileTrigger");
            if (trigger) trigger.innerHTML = renderAvatarHtml(currentUser);

            // Set View Profile Link
            const profileLink = document.getElementById("viewProfileLink");
            if (profileLink) profileLink.href = `/profile.html?id=${currentUser._id}`;

            // Mini Profile in Ask Composer
            const mini = document.getElementById("miniProfileContainer");
            if (mini) mini.innerHTML = renderAvatarHtml(currentUser, "mini");

            // Populate dropdown header
            const nameEl = document.getElementById("dropdownUserName");
            const emailEl = document.getElementById("dropdownUserEmail");
            if (nameEl) nameEl.innerText = currentUser.name || "User";
            if (emailEl) emailEl.innerText = currentUser.email || "";

            // Update Checklist in right sidebar
            updateChecklist(currentUser);
        } else if (response.status === 401) {
            window.location.href = "/login";
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

function updateChecklist(user) {
    const bioIcon = document.getElementById("checkBioIcon");
    if (bioIcon) {
        if (user.bio && user.bio.trim().length > 0) {
            bioIcon.className = "fas fa-check-circle completed";
            bioIcon.style.color = "#2e7d32";
        } else {
            bioIcon.className = "far fa-circle";
            bioIcon.style.color = "var(--text-secondary)";
        }
    }
    const upvotesIcon = document.getElementById("checkUpvotesIcon");
    if (upvotesIcon) {
        upvotesIcon.className = "far fa-check-circle completed";
        upvotesIcon.style.color = "#2e7d32";
    }
}

function renderAvatarHtml(user, sizeClass = "") {
    const name = user?.name || "User";
    const initial = name.charAt(0).toUpperCase();
    const hasPhoto = user?.profilePic && user.profilePic !== "" && !user.profilePic.includes("default-avatar.png");

    if (hasPhoto) {
        return `<img src="${user.profilePic}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
        return `<div class="avatar-letter ${sizeClass}">${initial}</div>`;
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

// --- Feed Logic ---

async function loadQuestions() {
    const feed = document.getElementById("feedContent");
    if (!feed) return;

    feed.innerHTML = `
        <div class="loading-state" style="padding:40px; text-align:center; color:var(--text-secondary);">
            <i class="fas fa-circle-notch fa-spin" style="font-size:24px; color:var(--primary-color); margin-bottom:12px;"></i>
            <p>Loading salon discussions...</p>
        </div>
    `;

    try {
        let url = `/api/questions?`;
        if (currentSpace && currentSpace !== "All") {
            url += `space=${encodeURIComponent(currentSpace)}&`;
        }
        if (searchQuery) {
            url += `search=${encodeURIComponent(searchQuery)}&`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load questions");
        const questions = await response.json();

        if (questions.length === 0) {
            feed.innerHTML = `
                <div class="card" style="padding:48px 24px; text-align:center; color:var(--text-secondary); background:var(--card-bg); border-radius:16px; border:1px solid var(--border-color);">
                    <i class="fas fa-feather-alt" style="font-size:36px; color:var(--primary-color); margin-bottom:16px; opacity:0.8;"></i>
                    <h3 style="font-size:18px; color:var(--text-main); margin-bottom:8px;">No discussions yet in ${currentSpace === 'All' ? 'MindForum' : currentSpace}</h3>
                    <p style="font-size:14px; max-width:380px; margin:0 auto 20px auto;">Be the intellectual pioneer. Pose the first thesis or inquiry to the salon community.</p>
                    <button class="btn-ask" onclick="openAskModal()" style="margin:0 auto;">Ask First Question</button>
                </div>
            `;
            return;
        }

        feed.innerHTML = "";
        questions.forEach(q => {
            const card = createQuestionCard(q);
            feed.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading feed:", err);
        feed.innerHTML = `
            <div class="card" style="padding:32px; text-align:center; color:var(--text-secondary);">
                <p>Could not connect to the salon feed. Please refresh the page.</p>
            </div>
        `;
    }
}

function createQuestionCard(q) {
    const card = document.createElement("div");
    card.className = "question-card";

    const user = q.user || {};
    const authorName = user.name || "Anonymous Thinker";
    const authorTitle = user.title || "Salon Contributor";
    const isExpert = user.isVerified || (user.credentials && user.credentials.length > 0);
    const spaceBadge = q.spaces || "General";
    const timeFormatted = timeAgo(q.createdAt);

    const isAuthor = currentUser && (user._id === currentUser._id || q.user === currentUser._id);
    const deleteBtn = isAuthor ? `
        <button class="delete-post-btn" onclick="deleteQuestion('${q._id}', event)" title="Delete Question">
            <i class="fas fa-trash-alt"></i>
        </button>
    ` : "";

    const mediaHtml = q.mediaUrl ? `
        <div class="media-container" style="border-radius:12px; overflow:hidden; margin:14px 0; background:#000; max-height:360px;">
            ${q.mediaType === 'video' ? 
                `<video src="${q.mediaUrl}" controls style="width:100%; max-height:360px;"></video>` :
                `<img src="${q.mediaUrl}" alt="Attachment" style="width:100%; max-height:360px; object-fit:cover;" onerror="this.parentElement.style.display='none'">`
            }
        </div>
    ` : "";

    const upvotesCount = q.upvotes ? q.upvotes.length : 0;
    const isUpvoted = currentUser && q.upvotes && q.upvotes.includes(currentUser._id);
    const isDownvoted = currentUser && q.downvotes && q.downvotes.includes(currentUser._id);
    const answersCount = q.answersCount !== undefined ? q.answersCount : 0;

    card.innerHTML = `
        ${deleteBtn}
        <div class="card-header" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div class="avatar-container mini" onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer;">
                ${renderAvatarHtml(user, "mini")}
            </div>
            <div class="user-info" style="line-height:1.35;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <h4 onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer; font-size:15px; font-weight:600; color:var(--text-main); margin:0;">
                        ${escapeHtml(authorName)}
                    </h4>
                    ${isExpert ? `<span class="expert-badge" style="color:var(--primary-color); font-weight:700; font-size:10px; text-transform:uppercase; background:rgba(158,27,27,0.08); padding:2px 6px; border-radius:4px;">EXPERT</span>` : ""}
                </div>
                <span style="font-size:12px; color:var(--text-secondary);">
                    ${escapeHtml(authorTitle)} • Posted in <strong style="color:var(--primary-color);">${escapeHtml(spaceBadge)}</strong> • ${timeFormatted}
                </span>
            </div>
        </div>

        <div class="card-content" onclick="window.location.href='/question.html?id=${q._id}'" style="cursor:pointer;">
            <h2 style="font-size:18px; font-weight:700; line-height:1.4; color:var(--text-main); margin-bottom:10px;">
                ${escapeHtml(q.content)}
            </h2>
            ${mediaHtml}
        </div>

        <div class="card-stats" style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:10px; border-top:1px solid var(--border-color);">
            <div class="stat-left" style="display:flex; align-items:center; gap:12px;">
                <!-- Upvote/Downvote Pill Widget -->
                <div class="btn-upvote-group" style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:24px; display:flex; align-items:center;">
                    <button class="btn-vote ${isUpvoted ? 'active' : ''}" onclick="toggleQuestionVote('${q._id}', 'upvote', this)" style="background:none; border:none; padding:6px 12px; cursor:pointer; font-size:13px; font-weight:600; color:${isUpvoted ? 'var(--primary-color)' : 'var(--text-secondary)'}; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border-color);">
                        <i class="fas fa-arrow-up"></i>
                        <span class="count">${upvotesCount}</span>
                    </button>
                    <button class="btn-vote ${isDownvoted ? 'active' : ''}" onclick="toggleQuestionVote('${q._id}', 'downvote', this)" style="background:none; border:none; padding:6px 12px; cursor:pointer; font-size:13px; color:${isDownvoted ? '#333' : 'var(--text-secondary)'};" title="Downvote">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                </div>

                <!-- Comments / Answers Count -->
                <button class="stat-item" onclick="window.location.href='/question.html?id=${q._id}'" style="background:none; border:none; font-size:13px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 10px; border-radius:20px;">
                    <i class="far fa-comment"></i>
                    <span>${answersCount}</span>
                </button>

                <!-- Share -->
                <button class="stat-item" onclick="shareQuestion('${q._id}', '${escapeHtml(q.content).replace(/'/g, "\\'")}')" style="background:none; border:none; font-size:13px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 10px; border-radius:20px;">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>

            <div class="stat-right">
                <span style="font-size:12px; color:var(--text-secondary);">
                    <i class="far fa-eye"></i> ${q.views || 0} views
                </span>
            </div>
        </div>
    `;

    return card;
}

// Upvote / Downvote toggle on question
async function toggleQuestionVote(questionId, type, btn) {
    try {
        const response = await fetch(`/api/questions/${questionId}/${type}`, { method: 'POST' });
        if (!response.ok) return;
        const data = await response.json();

        const group = btn.closest(".btn-upvote-group");
        const upBtn = group.querySelectorAll(".btn-vote")[0];
        const downBtn = group.querySelectorAll(".btn-vote")[1];

        upBtn.querySelector(".count").innerText = data.upvotesCount;

        if (data.isUpvoted) {
            upBtn.style.color = "var(--primary-color)";
            downBtn.style.color = "var(--text-secondary)";
        } else if (data.isDownvoted) {
            upBtn.style.color = "var(--text-secondary)";
            downBtn.style.color = "#333";
        } else {
            upBtn.style.color = "var(--text-secondary)";
            downBtn.style.color = "var(--text-secondary)";
        }
    } catch (err) {
        console.error("Voting error:", err);
    }
}

function shareQuestion(id, titleSnippet) {
    const url = `${window.location.origin}/question.html?id=${id}`;
    navigator.clipboard.writeText(url).then(() => {
        alert(`Link to question copied to clipboard:\n${url}`);
    }).catch(() => {
        prompt("Copy this question link:", url);
    });
}

async function deleteQuestion(questionId, e) {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this discussion question?")) return;

    try {
        const response = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
        if (response.ok) {
            loadQuestions();
        } else {
            alert("Failed to delete question.");
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// Space filter from left sidebar
function filterBySpace(spaceName, element) {
    currentSpace = spaceName;

    const listItems = document.querySelectorAll("#spacesSidebarList li");
    listItems.forEach(li => li.classList.remove("active"));
    if (element) element.classList.add("active");

    loadQuestions();
}

// Real-time search handler
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    searchQuery = e.target.value.trim();
    searchTimeout = setTimeout(() => {
        loadQuestions();
    }, 350);
}

// --- Suggested Topics Sidebar (Dynamic) ---
async function loadSidebarSpaces() {
    const list = document.getElementById("suggestedTopicsList");
    if (!list) return;

    try {
        const response = await fetch("/api/spaces");
        if (!response.ok) return;
        const spaces = await response.json();

        list.innerHTML = spaces.slice(0, 4).map(s => `
            <li onclick="window.location.href='/spaces.html?space=${encodeURIComponent(s.name)}'" style="cursor:pointer; display:flex; align-items:flex-start; gap:10px; margin-bottom:14px;">
                <i class="${s.icon}" style="color:var(--primary-color); font-size:16px; margin-top:2px;"></i>
                <div class="topic-info">
                    <strong style="font-size:14px; color:var(--text-main); font-weight:600;">${s.name}</strong>
                    <span style="font-size:12px; color:var(--text-secondary);">${s.membersCount} followers • ${s.questionCount} posts</span>
                </div>
            </li>
        `).join("");
    } catch (err) {
        console.error("Error loading spaces:", err);
    }
}

// --- Ask Modal Flow ---
function openAskModal(preselectedSpace = "General") {
    const modal = document.getElementById("askModal");
    if (!modal) return;
    modal.style.display = "block";

    const select = document.getElementById("questionSpaceSelect");
    if (select && preselectedSpace && preselectedSpace !== "All") {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value.toLowerCase() === preselectedSpace.toLowerCase()) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    const input = document.getElementById("questionContent");
    if (input) input.focus();
}

function closeAskModal() {
    const modal = document.getElementById("askModal");
    if (modal) modal.style.display = "none";
    const content = document.getElementById("questionContent");
    if (content) content.value = "";
    removeMedia();
}

function handleMediaSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const container = document.getElementById("mediaPreviewContainer");
    const imgPreview = document.getElementById("imagePreview");
    const vidPreview = document.getElementById("videoPreview");

    const reader = new FileReader();
    reader.onload = (ev) => {
        container.classList.remove("hidden");
        if (file.type.startsWith("image/")) {
            imgPreview.src = ev.target.result;
            imgPreview.classList.remove("hidden");
            vidPreview.classList.add("hidden");
        } else if (file.type.startsWith("video/")) {
            vidPreview.src = ev.target.result;
            vidPreview.classList.remove("hidden");
            imgPreview.classList.add("hidden");
        }
    };
    reader.readAsDataURL(file);
}

function removeMedia() {
    const mediaInput = document.getElementById("mediaInput");
    if (mediaInput) mediaInput.value = "";
    const container = document.getElementById("mediaPreviewContainer");
    if (container) container.classList.add("hidden");
}

async function submitQuestion(btn) {
    const contentInput = document.getElementById("questionContent");
    const spaceSelect = document.getElementById("questionSpaceSelect");
    const mediaInput = document.getElementById("mediaInput");

    const content = contentInput ? contentInput.value.trim() : "";
    const space = spaceSelect ? spaceSelect.value : "General";

    if (!content) {
        alert("Please write your question or thesis before submitting.");
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Publishing...";

    const formData = new FormData();
    formData.append("content", content);
    formData.append("spaces", space);
    if (mediaInput && mediaInput.files[0]) {
        formData.append("media", mediaInput.files[0]);
    }

    try {
        const response = await fetch("/api/questions", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            closeAskModal();
            loadQuestions();
        } else {
            const data = await response.json();
            alert(data.message || "Failed to publish question.");
        }
    } catch (err) {
        console.error("Posting error:", err);
        alert("An error occurred while posting.");
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

// Edit Profile Modal
function openEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (!modal) return;
    if (currentUser) {
        document.getElementById("editBio").value = currentUser.bio || "";
        document.getElementById("editInterests").value = (currentUser.interests || []).join(", ");
    }
    modal.style.display = "block";
}

function closeEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.style.display = "none";
}

async function updateProfile() {
    const bio = document.getElementById("editBio").value.trim();
    const interests = document.getElementById("editInterests").value.trim();

    try {
        const response = await fetch("/api/user/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bio, interests })
        });

        if (response.ok) {
            currentUser = await response.json();
            closeEditProfileModal();
            fetchUserData();
            alert("Profile updated successfully!");
        } else {
            alert("Failed to update profile.");
        }
    } catch (err) {
        console.error("Error updating profile:", err);
    }
}

function triggerProfileUpload() {
    const input = document.getElementById("profileUploadInput");
    if (input) input.click();
}

async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profilePic", file);

    try {
        const response = await fetch("/api/user/upload-profile-pic", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            if (currentUser) currentUser.profilePic = data.profilePic;
            fetchUserData();
        } else {
            alert("Failed to upload avatar photo.");
        }
    } catch (err) {
        console.error("Avatar upload error:", err);
    }
}

// Notifications Polling
async function checkNotifications() {
    try {
        const response = await fetch("/api/notifications");
        if (!response.ok) return;
        const list = await response.json();
        const unread = list.filter(n => !n.isRead);
        const dot = document.getElementById("notifDot");
        if (dot) {
            if (unread.length > 0) dot.classList.remove("hidden");
            else dot.classList.add("hidden");
        }
    } catch (e) {
        // quiet fail on polling
    }
}