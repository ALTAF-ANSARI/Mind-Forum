let currentQuestion = null;
let currentAnswers = [];
let currentUser = null;
let selectedMediaFile = null;

document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    await fetchUser();
    
    const urlParams = new URLSearchParams(window.location.search);
    const questionId = urlParams.get("id");

    if (!questionId) {
        document.getElementById("questionContainer").innerHTML = `
            <div class="card" style="padding:40px; text-align:center;">
                <h3>No question specified</h3>
                <p><a href="/home" style="color:var(--primary-color);">Return to Explore</a></p>
            </div>
        `;
        return;
    }

    await loadQuestionDetails(questionId);
    await loadAnswers(questionId);
});

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
}

async function fetchUser() {
    try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
            currentUser = await res.json();
            const avatarContainer = document.getElementById("profileTrigger");
            if (avatarContainer) {
                avatarContainer.innerHTML = renderAvatarHtml(currentUser);
            }
        }
    } catch (e) {
        console.error("User fetch error:", e);
    }
}

function renderAvatarHtml(user, sizeClass = "") {
    const name = user?.name || "User";
    const initial = name.charAt(0).toUpperCase();
    const hasPhoto = user?.profilePic && user.profilePic !== "" && !user.profilePic.includes("default-avatar.png");
    if (hasPhoto) {
        return `<img src="${user.profilePic}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    return `<div class="avatar-letter ${sizeClass}">${initial}</div>`;
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

async function loadQuestionDetails(id) {
    const container = document.getElementById("questionContainer");
    try {
        const response = await fetch(`/api/questions/${id}`);
        if (!response.ok) throw new Error("Question not found");
        currentQuestion = await response.json();

        const user = currentQuestion.user || {};
        const isUpvoted = currentUser && currentQuestion.upvotes?.includes(currentUser._id);
        const upvotesCount = currentQuestion.upvotes ? currentQuestion.upvotes.length : 0;
        const answersCount = currentQuestion.answersCount || 0;
        const viewsCount = currentQuestion.views || 0;
        const spaceName = currentQuestion.spaces || "General";

        const mediaHtml = currentQuestion.mediaUrl ? `
            <div style="margin:20px 0; border-radius:12px; overflow:hidden; background:#000; max-height:450px;">
                ${currentQuestion.mediaType === 'video' ? 
                    `<video src="${currentQuestion.mediaUrl}" controls style="width:100%; max-height:450px;"></video>` :
                    `<img src="${currentQuestion.mediaUrl}" alt="Attachment" style="width:100%; max-height:450px; object-fit:contain;" onerror="this.parentElement.style.display='none'">`
                }
            </div>
        ` : "";

        container.innerHTML = `
            <div class="question-detail-card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <a href="/spaces.html?space=${encodeURIComponent(spaceName)}" class="space-tag-badge" style="text-decoration:none;">
                        <i class="fas fa-layer-group"></i> ${escapeHtml(spaceName)}
                    </a>
                    <span style="font-size:12px; color:var(--text-secondary);">
                        Posted ${timeAgo(currentQuestion.createdAt)}
                    </span>
                </div>

                <h1 class="question-main-title">${escapeHtml(currentQuestion.content)}</h1>

                <div style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
                    <div class="avatar-container mini" onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer;">
                        ${renderAvatarHtml(user, "mini")}
                    </div>
                    <div>
                        <strong style="font-size:14px; cursor:pointer;" onclick="window.location.href='/profile.html?id=${user._id}'">${escapeHtml(user.name || "Anonymous")}</strong>
                        <span style="font-size:12px; color:var(--text-secondary); display:block;">${escapeHtml(user.title || "Salon Member")}</span>
                    </div>
                </div>

                ${mediaHtml}

                <div class="question-action-bar">
                    <div class="action-btn-group">
                        <button class="btn-action-pill primary" onclick="scrollToAnswerComposer()">
                            <i class="fas fa-edit"></i> Answer
                        </button>
                        <button class="btn-action-pill" onclick="shareCurrentQuestion()">
                            <i class="fas fa-share-alt"></i> Share
                        </button>
                        <button class="btn-action-pill" onclick="toggleSaveQuestion(this)">
                            <i class="far fa-bookmark"></i> Save
                        </button>
                    </div>
                    <div style="font-size:13px; color:var(--text-secondary); font-weight:500;">
                        <span><strong style="color:var(--text-main);">${answersCount}</strong> Answers</span> • 
                        <span><strong style="color:var(--text-main);">${viewsCount}</strong> Views</span>
                    </div>
                </div>
            </div>
        `;

        // Update Right Space Card
        updateSpaceCard(spaceName);
        // Load related questions in same space
        loadRelatedQuestions(spaceName, currentQuestion._id);

    } catch (err) {
        console.error("Error loading question:", err);
        container.innerHTML = `<div class="card" style="padding:30px; text-align:center;"><p>Discussion thread could not be loaded.</p></div>`;
    }
}

async function loadAnswers(questionId) {
    const list = document.getElementById("answersList");
    try {
        const response = await fetch(`/api/questions/${questionId}/answers`);
        if (!response.ok) throw new Error("Failed to load answers");
        currentAnswers = await response.json();

        renderAnswers(currentAnswers);
    } catch (err) {
        console.error("Answers error:", err);
        list.innerHTML = `<p style="color:var(--text-secondary); padding:20px 0;">Error loading answers.</p>`;
    }
}

function renderAnswers(answers) {
    const list = document.getElementById("answersList");
    if (!answers || answers.length === 0) {
        list.innerHTML = `
            <div class="card" style="padding:32px; text-align:center; color:var(--text-secondary); background:var(--card-bg); border-radius:14px; border:1px solid var(--border-color);">
                <i class="far fa-comments" style="font-size:32px; color:var(--primary-color); margin-bottom:12px;"></i>
                <p style="margin:0; font-size:14px;">No answers yet. Share your philosophical insight or practical experience below!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = answers.map(ans => {
        const user = ans.user || {};
        const isUpvoted = currentUser && ans.upvotes?.includes(currentUser._id);
        const upvotesCount = ans.upvotes ? ans.upvotes.length : 0;
        const isFollowing = currentUser?.following?.includes(user._id);

        const mediaHtml = ans.mediaUrl ? `
            <div style="margin:14px 0; border-radius:10px; overflow:hidden; max-height:300px; background:#000;">
                <img src="${ans.mediaUrl}" style="width:100%; max-height:300px; object-fit:contain;">
            </div>
        ` : "";

        return `
            <div class="answer-card" id="answer-${ans._id}">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar-container mini" onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer;">
                            ${renderAvatarHtml(user, "mini")}
                        </div>
                        <div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <strong style="font-size:14px; cursor:pointer;" onclick="window.location.href='/profile.html?id=${user._id}'">
                                    ${escapeHtml(user.name || "Anonymous")}
                                </strong>
                                ${user.isVerified ? `<span class="expert-badge" style="font-size:9px; padding:2px 5px; background:rgba(158,27,27,0.08); color:var(--primary-color); border-radius:3px;">VERIFIED</span>` : ""}
                            </div>
                            <span style="font-size:12px; color:var(--text-secondary);">
                                ${escapeHtml(user.title || "Researcher & Contributor")} • ${timeAgo(ans.createdAt)}
                            </span>
                        </div>
                    </div>

                    ${currentUser && currentUser._id !== user._id ? `
                        <button class="btn-action-pill" style="padding:4px 12px; font-size:11px;" onclick="toggleFollowUser('${user._id}', this)">
                            ${isFollowing ? 'Following' : '+ Follow'}
                        </button>
                    ` : ""}
                </div>

                <div style="font-size:14px; line-height:1.65; color:var(--text-main); margin-bottom:14px; white-space:pre-line;">
                    ${escapeHtml(ans.content)}
                </div>

                ${mediaHtml}

                <div style="display:flex; align-items:center; gap:16px; border-top:1px solid var(--border-color); padding-top:10px; margin-top:10px;">
                    <button class="btn-action-pill" onclick="upvoteAnswer('${ans._id}', this)" style="background:${isUpvoted ? 'rgba(158,27,27,0.08)' : 'var(--bg-color)'}; color:${isUpvoted ? 'var(--primary-color)' : 'var(--text-main)'};">
                        <i class="fas fa-arrow-up"></i>
                        <span>Upvote <strong class="ans-up-count">${upvotesCount}</strong></span>
                    </button>
                    <button class="btn-action-pill" onclick="scrollToAnswerComposer()" style="font-size:12px;">
                        <i class="far fa-comment"></i> Reply
                    </button>
                    <button class="btn-action-pill" onclick="shareCurrentQuestion()" style="font-size:12px;">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function sortAnswers() {
    const val = document.getElementById("answerSortSelect").value;
    if (val === "newest") {
        currentAnswers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
        currentAnswers.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
    }
    renderAnswers(currentAnswers);
}

function scrollToAnswerComposer() {
    const composer = document.getElementById("answerInput");
    if (composer) {
        composer.scrollIntoView({ behavior: "smooth" });
        composer.focus();
    }
}

function handleAnswerMedia(e) {
    const file = e.target.files[0];
    if (file) {
        selectedMediaFile = file;
        document.getElementById("answerMediaName").innerText = file.name;
    }
}

async function submitAnswer() {
    const input = document.getElementById("answerInput");
    const content = input.value.trim();
    if (!content) {
        alert("Please write your answer before submitting.");
        return;
    }

    const btn = document.getElementById("submitAnswerBtn");
    const origText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Submitting...";

    const formData = new FormData();
    formData.append("content", content);
    if (selectedMediaFile) {
        formData.append("media", selectedMediaFile);
    }

    try {
        const response = await fetch(`/api/questions/${currentQuestion._id}/answers`, {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            input.value = "";
            selectedMediaFile = null;
            document.getElementById("answerMediaName").innerText = "";
            await loadAnswers(currentQuestion._id);
            alert("Answer posted successfully!");
        } else {
            const err = await response.json();
            alert(err.message || "Failed to post answer.");
        }
    } catch (err) {
        console.error("Posting answer error:", err);
    } finally {
        btn.disabled = false;
        btn.innerText = origText;
    }
}

async function upvoteAnswer(answerId, btn) {
    try {
        const response = await fetch(`/api/answers/${answerId}/upvote`, { method: "POST" });
        if (!response.ok) return;
        const data = await response.json();

        const countEl = btn.querySelector(".ans-up-count");
        if (countEl) countEl.innerText = data.upvotesCount;

        if (data.isUpvoted) {
            btn.style.color = "var(--primary-color)";
            btn.style.background = "rgba(158, 27, 27, 0.08)";
        } else {
            btn.style.color = "var(--text-main)";
            btn.style.background = "var(--bg-color)";
        }
    } catch (e) {
        console.error("Upvote error:", e);
    }
}

async function toggleFollowUser(userId, btn) {
    try {
        const response = await fetch(`/api/user/follow/${userId}`, { method: "POST" });
        if (response.ok) {
            const data = await response.json();
            btn.innerText = data.isFollowing ? "Following" : "+ Follow";
        }
    } catch (e) {
        console.error("Follow error:", e);
    }
}

function shareCurrentQuestion() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard:\n" + url);
    }).catch(() => {
        prompt("Copy discussion link:", url);
    });
}

function toggleSaveQuestion(btn) {
    const icon = btn.querySelector("i");
    if (icon.classList.contains("far")) {
        icon.className = "fas fa-bookmark";
        btn.style.color = "var(--primary-color)";
        alert("Discussion saved to your bookmarks!");
    } else {
        icon.className = "far fa-bookmark";
        btn.style.color = "var(--text-main)";
    }
}

function updateSpaceCard(spaceName) {
    const title = document.getElementById("spaceCardTitle");
    const desc = document.getElementById("spaceCardDesc");
    const iconContainer = document.getElementById("spaceIconContainer");

    const spaceData = {
        "Psychology": { icon: "fas fa-brain", desc: "A community exploring cognitive systems, neural plasticity, and behavioral paradigms.", members: "1.2M", posts: "45k" },
        "Philosophy": { icon: "fas fa-book-open", desc: "Inquiry into ancient logic, Stoicism, existential ethics, and metaphysical truths.", members: "840k", posts: "28k" },
        "Technology": { icon: "fas fa-microchip", desc: "The frontier of AI alignment, computer science, hardware architectures, and digital ethics.", members: "2.4M", posts: "89k" },
        "Science": { icon: "fas fa-atom", desc: "Empirical discoveries, quantum mechanics, astrophysics, and scientific inquiry.", members: "3.1M", posts: "92k" },
        "Business": { icon: "fas fa-briefcase", desc: "Macroeconomic philosophy, venture models, and capital dynamics in intellectual systems.", members: "950k", posts: "31k" },
        "General": { icon: "fas fa-compass", desc: "Diverse intellectual discourse spanning multidisciplinary themes in the salon.", members: "500k", posts: "18k" }
    };

    const info = spaceData[spaceName] || spaceData["General"];
    if (title) title.innerText = `${spaceName} Space`;
    if (desc) desc.innerText = info.desc;
    if (iconContainer) iconContainer.innerHTML = `<i class="${info.icon}"></i>`;
    document.getElementById("spaceMembersCount").innerText = info.members;
    document.getElementById("spaceQuestionsCount").innerText = info.posts;
}

async function loadRelatedQuestions(spaceName, excludeId) {
    const list = document.getElementById("relatedQuestionsList");
    try {
        const response = await fetch(`/api/questions?space=${encodeURIComponent(spaceName)}`);
        if (!response.ok) return;
        const all = await response.json();
        const related = all.filter(q => q._id !== excludeId).slice(0, 4);

        if (related.length === 0) {
            list.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">No other questions in this space yet.</p>`;
            return;
        }

        list.innerHTML = related.map(q => `
            <div class="related-question-item" onclick="window.location.href='/question.html?id=${q._id}'">
                <h4>${escapeHtml(q.content.substring(0, 75))}${q.content.length > 75 ? '...' : ''}</h4>
                <span>${q.answersCount || 0} answers • ${q.views || 0} views</span>
            </div>
        `).join("");
    } catch (e) {
        console.error("Related questions error:", e);
    }
}

function joinCurrentSpace(btn) {
    if (btn.innerText.includes("Join")) {
        btn.innerText = "Joined";
        btn.style.background = "#2e7d32";
        alert(`You have joined the ${currentQuestion?.spaces || 'Salon'} Space!`);
    } else {
        btn.innerText = "Join Space";
        btn.style.background = "var(--primary-color)";
    }
}
