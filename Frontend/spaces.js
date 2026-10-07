let currentSpace = "Technology";
let currentTab = "trending";
let spaceSearchQuery = "";
let currentUser = null;

const SPACES_DATA = {
    "Technology": {
        icon: "fas fa-microchip",
        badge: "TECHNOLOGY • 2.4M MEMBERS",
        title: "Technology",
        desc: "The frontier of innovation. Discussing AI, future tech, engineering, and digital society.",
        founded: "May 2018",
        contributorsCount: "12.4K",
        about: "Technology is a place for engineers, researchers, and hobbyists to exchange knowledge about the tools shaping our tomorrow.",
        subtopics: ["Quantum Computing", "Rust Programming", "Cybersecurity", "Web3", "SaaS", "DevOps"],
        related: ["Science", "Business"]
    },
    "Psychology": {
        icon: "fas fa-brain",
        badge: "PSYCHOLOGY • 1.2M MEMBERS",
        title: "Psychology",
        desc: "Exploring the depths of the human mind, behavior, neurobiology, and cognitive peak states.",
        founded: "Oct 2017",
        contributorsCount: "8.9K",
        about: "Psychology is an open salon analyzing cognitive therapies, behavioral heuristics, and modern neuroscientific studies.",
        subtopics: ["Cognitive Science", "Flow State", "Neuroplasticity", "Behavioral Economics", "Mental Models"],
        related: ["Philosophy", "Science"]
    },
    "Philosophy": {
        icon: "fas fa-book-open",
        badge: "PHILOSOPHY • 840K MEMBERS",
        title: "Philosophy",
        desc: "Ancient wisdom, modern ethics, existential inquiry, and epistemology in the digital age.",
        founded: "Jan 2016",
        contributorsCount: "6.2K",
        about: "Philosophy explores the timeless dilemmas of human agency, truth, moral philosophy, and dialectics.",
        subtopics: ["Stoicism", "Epistemology", "Ethics & AI", "Existentialism", "Metaphysics", "Logic"],
        related: ["Psychology", "Technology"]
    },
    "Science": {
        icon: "fas fa-atom",
        badge: "SCIENCE • 3.1M MEMBERS",
        title: "Science",
        desc: "Empirical discoveries, quantum mechanics, physics, biology, and cosmological research.",
        founded: "Mar 2015",
        contributorsCount: "19.1K",
        about: "Science connects laboratory research with public dialogue, exploring experimental paradigms.",
        subtopics: ["Quantum Physics", "Astrophysics", "Genetics", "Renewable Energy", "Neuroscience"],
        related: ["Technology", "Philosophy"]
    },
    "Business": {
        icon: "fas fa-briefcase",
        badge: "BUSINESS • 950K MEMBERS",
        title: "Business",
        desc: "Macroeconomics, venture models, intellectual leadership, and market dynamics.",
        founded: "Aug 2019",
        contributorsCount: "7.5K",
        about: "Business explores capital distribution, startup strategy, game theory, and economic philosophy.",
        subtopics: ["Venture Capital", "Monetary Policy", "Leadership", "Game Theory", "Startups"],
        related: ["Technology", "Philosophy"]
    },
    "General": {
        icon: "fas fa-compass",
        badge: "GENERAL • 500K MEMBERS",
        title: "General",
        desc: "Open multidisciplinary discussions spanning intellectual frontiers.",
        founded: "Nov 2014",
        contributorsCount: "5.1K",
        about: "The open town square of MindForum.",
        subtopics: ["Intellectual Discourse", "Culture", "Writing", "Education"],
        related: ["Philosophy", "Psychology"]
    }
};

document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    await fetchUser();

    // Determine space from URL (e.g. ?space=Psychology or /technology)
    const urlParams = new URLSearchParams(window.location.search);
    const spaceParam = urlParams.get("space");
    const path = window.location.pathname.toLowerCase();

    if (spaceParam && SPACES_DATA[spaceParam]) {
        currentSpace = spaceParam;
    } else if (path.includes("psychology")) {
        currentSpace = "Psychology";
    } else if (path.includes("philosophy")) {
        currentSpace = "Philosophy";
    } else if (path.includes("technology")) {
        currentSpace = "Technology";
    } else if (path.includes("science")) {
        currentSpace = "Science";
    } else if (path.includes("business")) {
        currentSpace = "Business";
    }

    renderSpaceBanner();
    await loadSpaceQuestions();
    await loadTopContributors();
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
            if (avatarContainer) avatarContainer.innerHTML = renderAvatarHtml(currentUser);
            const mini = document.getElementById("miniProfileContainer");
            if (mini) mini.innerHTML = renderAvatarHtml(currentUser, "mini");
        }
    } catch (e) {}
}

function renderAvatarHtml(user, sizeClass = "") {
    const name = user?.name || "User";
    const initial = name.charAt(0).toUpperCase();
    const hasPhoto = user?.profilePic && user.profilePic !== "" && !user.profilePic.includes("default-avatar.png");
    if (hasPhoto) {
        return `<img src="${user.profilePic}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    return `<div class="avatar-letter ${sizeClass}">${initial}</div>`;
}

function switchSpace(spaceName) {
    if (!SPACES_DATA[spaceName]) return;
    currentSpace = spaceName;
    renderSpaceBanner();
    loadSpaceQuestions();
    loadTopContributors();
}

function renderSpaceBanner() {
    const data = SPACES_DATA[currentSpace] || SPACES_DATA["General"];

    // Update Banner
    document.getElementById("spaceHeroIcon").innerHTML = `<i class="${data.icon}"></i>`;
    document.getElementById("spaceHeroBadge").innerText = data.badge;
    document.getElementById("spaceHeroTitle").innerText = data.title;
    document.getElementById("spaceHeroDesc").innerText = data.desc;
    document.getElementById("composerPlaceholder").placeholder = `What would you like to ask or share about ${data.title}?`;

    // Highlight left nav
    const navItems = document.querySelectorAll("#spacesNavList li");
    navItems.forEach(li => {
        if (li.getAttribute("data-space") === currentSpace) {
            li.className = "active";
        } else if (!li.hasAttribute("data-space") && currentSpace === "Home") {
            li.className = "active";
        } else {
            li.className = "";
        }
    });

    // Update Right Sidebar
    document.getElementById("sidebarContributorsCount").innerText = data.contributorsCount;
    document.getElementById("sidebarSpaceDesc").innerText = data.about;

    // Subtopics
    const subtopicsContainer = document.getElementById("subTopicsList");
    if (subtopicsContainer) {
        subtopicsContainer.innerHTML = data.subtopics.map(tag => `
            <div class="tag-pill" onclick="filterBySubtopic('${tag}')">${tag}</div>
        `).join("");
    }

    // Related Spaces
    const relatedContainer = document.getElementById("relatedSpacesList");
    if (relatedContainer) {
        relatedContainer.innerHTML = data.related.map(rel => {
            const relData = SPACES_DATA[rel] || {};
            return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="switchSpace('${rel}')">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="${relData.icon}" style="color:var(--primary-color);"></i>
                        <span style="font-size:13px; font-weight:600; color:var(--text-main);">${rel}</span>
                    </div>
                    <i class="fas fa-chevron-right" style="font-size:11px; color:var(--text-secondary);"></i>
                </div>
            `;
        }).join("");
    }
}

function setTab(tabName, btn) {
    currentTab = tabName;
    document.querySelectorAll(".space-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadSpaceQuestions();
}

async function loadSpaceQuestions() {
    const feed = document.getElementById("spaceFeedContent");
    feed.innerHTML = `
        <div class="loading-state" style="padding:40px; text-align:center; color:var(--text-secondary);">
            <i class="fas fa-circle-notch fa-spin" style="font-size:24px; color:var(--primary-color);"></i>
            <p>Loading questions in ${currentSpace}...</p>
        </div>
    `;

    try {
        let sortQuery = "recent";
        if (currentTab === "trending") sortQuery = "trending";
        else if (currentTab === "top") sortQuery = "top";

        let url = `/api/questions?space=${encodeURIComponent(currentSpace)}&sort=${sortQuery}`;
        if (spaceSearchQuery) url += `&search=${encodeURIComponent(spaceSearchQuery)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load questions");
        let questions = await response.json();

        if (currentTab === "unanswered") {
            questions = questions.filter(q => (q.answersCount || 0) === 0);
        }

        if (questions.length === 0) {
            feed.innerHTML = `
                <div class="card" style="padding:40px; text-align:center; color:var(--text-secondary); background:var(--card-bg); border-radius:14px; border:1px solid var(--border-color);">
                    <i class="fas fa-comments" style="font-size:32px; color:var(--primary-color); margin-bottom:12px;"></i>
                    <h3 style="color:var(--text-main); margin-bottom:6px;">No discussions yet in ${currentSpace}</h3>
                    <p style="font-size:14px; margin-bottom:16px;">Be the first to start a conversation in this space.</p>
                    <button class="btn-ask" onclick="openAskModal()">Ask Question in ${currentSpace}</button>
                </div>
            `;
            return;
        }

        feed.innerHTML = questions.map(q => renderQuestionCard(q)).join("");
    } catch (err) {
        console.error("Space questions error:", err);
        feed.innerHTML = `<div class="card" style="padding:30px; text-align:center;"><p>Error loading feed.</p></div>`;
    }
}

function renderQuestionCard(q) {
    const user = q.user || {};
    const authorName = user.name || "Anonymous";
    const authorTitle = user.title || "Salon Thinker";
    const upvotesCount = q.upvotes ? q.upvotes.length : 0;
    const isUpvoted = currentUser && q.upvotes?.includes(currentUser._id);
    const answersCount = q.answersCount || 0;

    const mediaHtml = q.mediaUrl ? `
        <div class="media-container" style="border-radius:12px; overflow:hidden; margin:14px 0; background:#000; max-height:360px;">
            <img src="${q.mediaUrl}" style="width:100%; max-height:360px; object-fit:cover;" onerror="this.parentElement.style.display='none'">
        </div>
    ` : "";

    return `
        <div class="question-card">
            <div class="card-header" style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
                <div class="avatar-container mini" onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer;">
                    ${renderAvatarHtml(user, "mini")}
                </div>
                <div class="user-info">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <h4 onclick="window.location.href='/profile.html?id=${user._id}'" style="cursor:pointer; font-size:15px; margin:0;">${authorName}</h4>
                        ${user.isVerified ? `<span class="expert-badge">EXPERT</span>` : ""}
                    </div>
                    <span style="font-size:12px; color:var(--text-secondary);">${authorTitle} • ${timeAgo(q.createdAt)}</span>
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
                    <div class="btn-upvote-group" style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:24px; display:flex;">
                        <button class="btn-vote" onclick="toggleSpaceVote('${q._id}', 'upvote', this)" style="background:none; border:none; padding:6px 12px; cursor:pointer; color:${isUpvoted ? 'var(--primary-color)' : 'var(--text-secondary)'};">
                            <i class="fas fa-arrow-up"></i> <span class="count">${upvotesCount}</span>
                        </button>
                        <button class="btn-vote" onclick="toggleSpaceVote('${q._id}', 'downvote', this)" style="background:none; border:none; padding:6px 12px; cursor:pointer; color:var(--text-secondary);">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>

                    <button class="stat-item" onclick="window.location.href='/question.html?id=${q._id}'" style="background:none; border:none; cursor:pointer; color:var(--text-secondary);">
                        <i class="far fa-comment"></i> ${answersCount}
                    </button>

                    <button class="stat-item" onclick="shareQuestion('${q._id}')" style="background:none; border:none; cursor:pointer; color:var(--text-secondary);">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>

                <div class="stat-right">
                    <span style="font-size:12px; color:var(--text-secondary);">
                        <i class="far fa-eye"></i> ${q.views || 0}
                    </span>
                </div>
            </div>
        </div>
    `;
}

async function toggleSpaceVote(questionId, type, btn) {
    try {
        const res = await fetch(`/api/questions/${questionId}/${type}`, { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        const card = btn.closest(".question-card");
        const upBtn = card.querySelectorAll(".btn-vote")[0];
        upBtn.querySelector(".count").innerText = data.upvotesCount;
        if (data.isUpvoted) {
            upBtn.style.color = "var(--primary-color)";
        } else {
            upBtn.style.color = "var(--text-secondary)";
        }
    } catch (e) {
        console.error("Vote error:", e);
    }
}

async function loadTopContributors() {
    const list = document.getElementById("topContributorsList");
    if (!list) return;

    try {
        const response = await fetch(`/api/spaces/${encodeURIComponent(currentSpace)}/contributors`);
        if (!response.ok) return;
        const contributors = await response.json();

        if (contributors.length === 0) {
            list.innerHTML = `<p style="font-size:12px; color:var(--text-secondary);">No contributors yet.</p>`;
            return;
        }

        list.innerHTML = contributors.map((u, i) => `
            <div class="contributor-item" onclick="window.location.href='/profile.html?id=${u._id}'" style="cursor:pointer;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="avatar-container small">
                        ${renderAvatarHtml(u, "small")}
                    </div>
                    <div>
                        <strong style="font-size:13px; color:var(--text-main); display:block;">${escapeHtml(u.name)}</strong>
                        <span style="font-size:11px; color:var(--text-secondary);">${escapeHtml(u.title || "Scholar")}</span>
                    </div>
                </div>
                <span style="font-size:12px; font-weight:700; color:var(--primary-color);">
                    ${(6 - i) * 1.8}k pts
                </span>
            </div>
        `).join("");
    } catch (e) {
        console.error("Contributors error:", e);
    }
}

function handleSpaceSearch(e) {
    spaceSearchQuery = e.target.value.trim();
    loadSpaceQuestions();
}

function filterBySubtopic(tag) {
    spaceSearchQuery = tag;
    document.getElementById("spaceSearchInput").value = tag;
    loadSpaceQuestions();
}

function toggleFollowSpace(btn) {
    if (btn.innerText === "Follow Space") {
        btn.innerText = "Following";
        btn.style.background = "#2e7d32";
        alert(`You are now following ${currentSpace}!`);
    } else {
        btn.innerText = "Follow Space";
        btn.style.background = "var(--primary-color)";
    }
}

function openAskModal() {
    document.getElementById("modalTitle").innerText = `Ask in ${currentSpace}`;
    document.getElementById("askModal").style.display = "block";
}

function closeAskModal() {
    document.getElementById("askModal").style.display = "none";
}

async function submitSpaceQuestion(btn) {
    const content = document.getElementById("questionContent").value.trim();
    const mediaInput = document.getElementById("mediaInput");

    if (!content) {
        alert("Please write your question.");
        return;
    }

    const orig = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Posting...";

    const formData = new FormData();
    formData.append("content", content);
    formData.append("spaces", currentSpace);
    if (mediaInput.files[0]) {
        formData.append("media", mediaInput.files[0]);
    }

    try {
        const response = await fetch("/api/questions", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            document.getElementById("questionContent").value = "";
            mediaInput.value = "";
            closeAskModal();
            loadSpaceQuestions();
        } else {
            alert("Failed to post question.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = orig;
    }
}

function shareQuestion(id) {
    const url = `${window.location.origin}/question.html?id=${id}`;
    navigator.clipboard.writeText(url).then(() => {
        alert("Discussion link copied:\n" + url);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[t]));
}

function timeAgo(dateString) {
    const d = new Date(dateString);
    const diff = Math.floor((new Date() - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
}
