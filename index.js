import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, query, limitToLast, limitToFirst, orderByKey, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDCLSzy1JRhoZiGQaolmlxTqRH1vob2KC8",
  authDomain: "secret-chat-ec8d1.firebaseapp.com",
  databaseURL: "https://secret-chat-ec8d1-default-rtdb.firebaseio.com",
  projectId: "secret-chat-ec8d1",
  storageBucket: "secret-chat-ec8d1.firebasestorage.app",
  messagingSenderId: "1072386242503",
  appId: "1:1072386242503:web:4b9086d6c750984fb7cbe2",
  measurementId: "G-KKLC48KJ0B"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let lunaProfile = { avatar: '', photoUrl: '', bio: '' };

// ─── Pagination State ───────────────────────────────────────────────────
// isLiveMode = true  → always show the LAST N messages (real-time tail)
// isLiveMode = false → show a fixed window starting at windowStart
let isLiveMode = true;
let windowStart = 0;      // index (0-based) of first message in window
let windowSize  = 15;     // how many messages to show at once
let totalMessages = [];   // full ordered list of all DB keys + values
let globalMessages = [];
let lastSavedMessages = [];
let messagesListener = null;
let donotScrollThisTime = false;

// Subscribe to ALL messages once, keep them sorted, then slice window
function startMessagesSubscription() {
    if (typeof messagesListener === 'function') messagesListener();

    const messagesQuery = query(ref(db, 'messages'), orderByKey());

    messagesListener = onValue(messagesQuery, (snapshot) => {
        const msgs = [];
        snapshot.forEach((child) => {
            let m = child.val();
            if (m && typeof m === 'object') {
                m._dbKey = child.key;
                msgs.push(m);
            }
        });

        totalMessages = msgs; // full list

        // In live mode, anchor window to the END
        if (isLiveMode) {
            windowStart = Math.max(0, totalMessages.length - windowSize);
        }

        applyWindow();
    });
}

// Slice totalMessages by [windowStart, windowStart+windowSize)
function applyWindow() {
    const slice = totalMessages.slice(windowStart, windowStart + windowSize);
    globalMessages = slice;
    lastSavedMessages = JSON.parse(JSON.stringify(globalMessages));

    if (currentRole === 'luna') {
        renderLunaMessages();
        if (donotScrollThisTime) {
            donotScrollThisTime = false;
        } else if (isLiveMode) {
            scrollLuna();
        }
    } else if (currentRole === 'admin') {
        renderAdmin();
        if (donotScrollThisTime) {
            donotScrollThisTime = false;
        } else if (isLiveMode) {
            scrollAdmin();
        }
    }
}

// Start listening
startMessagesSubscription();

onValue(ref(db, 'profile'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        lunaProfile = data;
        if (typeof updateProfileUI === 'function') updateProfileUI();
    }
});

/* ═══════════════ STORAGE KEYS ═══════════════ */
const STORAGE_SESSION  = 'secretroom_session';
const LUNA_PASS  = 'malak mahmoud';
const ADMIN_PASS = '3bdduo';

/* ═══════════════ DOM REFS ═══════════════ */
const $ = id => document.getElementById(id);

const loginScreen     = $('loginScreen');
const loginForm       = $('loginForm');
const passwordInput   = $('passwordInput');
const togglePasswordBtn = $('togglePasswordBtn');
const loginError      = $('loginError');

const lunaChat        = $('lunaChat');
const lunaMessages    = $('lunaMessages');
const lunaTextInput   = $('lunaTextInput');
const lunaLogout      = $('lunaLogout');
const lunaScrollBottom = $('lunaScrollBottom');
const lunaRefresh       = $('lunaRefresh');

const adminDash       = $('adminDash');
const adminMessages   = $('adminMessages');
const adminReplyInput = $('adminReplyInput');
const adminReplyBtn   = $('adminReplyBtn');
const adminLogout     = $('adminLogout');
const adminSearch     = $('adminSearch');
const adminRefresh      = $('adminRefresh');
const adminScrollBottom = $('adminScrollBottom');

const profileModal      = $('profileModal');
const profileCloseBtn   = $('profileCloseBtn');
const profileSaveBtn    = $('profileSaveBtn');
const profileAvatarInput= $('profileAvatarInput');
const profileBioInput   = $('profileBioInput');
const profilePhotoInput = $('profilePhotoInput');
const profileImagePreview=$('profileImagePreview');
const profileAvatarPreview=$('profileAvatarPreview');
const profilePhotoPlaceholder=$('profilePhotoPlaceholder');
const lunaProfileTrigger= $('lunaProfileTrigger');
const lunaTopAvatar     = $('lunaTopAvatar');
const lunaTopBio        = $('lunaTopBio');

/* ═══════════════ STATE ═══════════════ */
let currentRole = null;       // 'luna' | 'admin' | null
let lunaShowSaved = false;

/* ═══════════════ HELPERS ═══════════════ */
function getMessages() {
    return globalMessages || [];
}

// Always use the FULL list for ID generation to prevent duplicates
function getAllMessages() {
    return totalMessages || [];
}

function nextId() {
    // Always compute from the FULL list, not the window slice
    const all = getAllMessages();
    if (!all.length) return 1;
    let max = 0;
    for (let i = 0; i < all.length; i++) {
        if (all[i].id > max) max = all[i].id;
    }
    return max + 1;
}

function shortTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true });
}

function formatDateSeparator(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showToast(message) {
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function scrollLuna() {
    if (lunaMessages) lunaMessages.scrollTop = lunaMessages.scrollHeight;
}

function scrollAdmin() {
    if (adminMessages) adminMessages.scrollTop = adminMessages.scrollHeight;
}

/* ═══════════════ SESSION ═══════════════ */
function getSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_SESSION)); }
    catch { return null; }
}
function setSession(role) {
    localStorage.setItem(STORAGE_SESSION, JSON.stringify({ role }));
}
function clearSession() {
    localStorage.removeItem(STORAGE_SESSION);
}

/* ═══════════════ ROUTING ═══════════════ */
function showScreen(role) {
    currentRole = role;
    loginScreen.classList.add('hidden');
    lunaChat.classList.add('hidden');
    adminDash.classList.add('hidden');

    setTimeout(() => {
        if (role === 'luna') {
            lunaChat.classList.remove('hidden');
            if (typeof updateProfileUI === 'function') updateProfileUI();
            renderLunaMessages();
            scrollLuna();
        } else if (role === 'admin') {
            adminDash.classList.remove('hidden');
            renderAdmin();
            scrollAdmin();
        } else {
            loginScreen.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.type = 'password';
            loginError.textContent = '';
            passwordInput.focus();
        }
    }, 50);
}

/* ═══════════════ LOGIN ═══════════════ */
togglePasswordBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePasswordBtn.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
    }
});

loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const pw = passwordInput.value.trim();
    if (pw === LUNA_PASS) {
        setSession('luna');
        showScreen('luna');
    } else if (pw === ADMIN_PASS) {
        setSession('admin');
        showScreen('admin');
    } else {
        loginError.textContent = 'Wrong password ✕';
        passwordInput.value = '';
        passwordInput.focus();
    }
});

/* ═══════════════ LOGOUT ═══════════════ */
lunaLogout.addEventListener('click', () => { clearSession(); showScreen(null); });
adminLogout.addEventListener('click', () => { clearSession(); showScreen(null); });

/* ═══════════════ PROFILE LOGIC ═══════════════ */
window.updateProfileUI = function() {
    if (!lunaTopBio) return;
    lunaTopBio.textContent = lunaProfile.bio || "Make your own bio";
    
    if (lunaProfile.photoUrl) {
        lunaTopAvatar.innerHTML = `<img src="${lunaProfile.photoUrl}" style="width:100%;height:100%;object-fit:cover;" />`;
    } else if (lunaProfile.avatar) {
        lunaTopAvatar.innerHTML = `<span class="avatar-emoji">${lunaProfile.avatar}</span>`;
    } else {
        lunaTopAvatar.innerHTML = `<span style="font-size: 10px; text-align: center; line-height: 1.1; color: #fff; padding: 2px;">Make your<br>own avatar</span>`;
    }

    if (lunaProfile.photoUrl) {
        profileImagePreview.src = lunaProfile.photoUrl;
        profileImagePreview.classList.remove('hidden');
        profileAvatarPreview.classList.add('hidden');
        profilePhotoPlaceholder.classList.add('hidden');
    } else if (lunaProfile.avatar) {
        profileImagePreview.classList.add('hidden');
        profileAvatarPreview.textContent = lunaProfile.avatar;
        profileAvatarPreview.classList.remove('hidden');
        profilePhotoPlaceholder.classList.add('hidden');
    } else {
        profileImagePreview.classList.add('hidden');
        profileAvatarPreview.classList.add('hidden');
        profilePhotoPlaceholder.classList.remove('hidden');
    }
    
    profileAvatarInput.value = lunaProfile.avatar || '';
    profileBioInput.value = lunaProfile.bio || '';
}

if (lunaProfileTrigger) {
    lunaProfileTrigger.addEventListener('click', () => {
        if (currentRole === 'luna') {
            profileModal.classList.remove('hidden');
            updateProfileUI();
        }
    });
}

if (profileCloseBtn) {
    profileCloseBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
        updateProfileUI();
    });
}

if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            lunaProfile.photoUrl = reader.result;
            updateProfileUI();
        };
        reader.readAsDataURL(file);
    });
}

if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', () => {
        lunaProfile.avatar = profileAvatarInput.value.trim();
        lunaProfile.bio = profileBioInput.value.trim();
        
        set(ref(db, 'profile'), lunaProfile)
            .then(() => {
                showToast("Profile updated! 🌸");
                profileModal.classList.add('hidden');
            })
            .catch(err => showToast("Error saving profile."));
    });
}

/* ═══════════════ REFRESH ═══════════════ */
window.softRefresh = function() {
    showToast("Restoring data... 🔄");
    startMessagesSubscription();
    setTimeout(() => showToast("Data restored! ✨"), 600);
};

if (lunaRefresh) lunaRefresh.addEventListener('click', () => window.softRefresh());
if (adminRefresh) adminRefresh.addEventListener('click', () => window.softRefresh());

/* ═══════════════ MESSAGE SENDING LOGIC ═══════════════ */
function sendTextMessage(sender, text) {
    if (!text.trim()) return;
    const newId = nextId(); // uses full totalMessages list
    
    const newMsg = {
        id: newId,
        sender: sender,
        type: 'text',
        content: text.trim(),
        timestamp: new Date().toISOString()
    };
    
    set(ref(db, `messages/${newId}`), newMsg)
        .catch(err => console.error("Send failed", err));
}

// Listeners for inputs
lunaTextInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = lunaTextInput.value.trim();
        if (text) {
            sendTextMessage('luna', text);
            lunaTextInput.value = '';
        }
    }
});

adminReplyBtn.addEventListener('click', () => {
    const text = adminReplyInput.value.trim();
    if (text) {
        sendTextMessage('admin', text);
        adminReplyInput.value = '';
    }
});

adminReplyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const text = adminReplyInput.value.trim();
        if (text) {
            sendTextMessage('admin', text);
            adminReplyInput.value = '';
        }
    }
});

/* ═══════════════ LUNA — RENDER ═══════════════ */
function renderLunaMessages() {
    // For saved/deleted views, search the FULL list — not just the current window
    let msgs;
    if (lunaShowSaved) {
        msgs = getAllMessages().filter(m => !m.deletedByLuna && m.savedByLuna);
    } else {
        msgs = getMessages().filter(m => !m.deletedByLuna);
    }

    // ─── Pagination controls at top ───────────────────────────────────────
    const canGoOlder  = windowStart > 0;
    const canGoNewer  = (windowStart + windowSize) < totalMessages.length;
    const isAtFirst   = windowStart === 0;
    const isAtLast    = !canGoNewer;
    const pageInfo    = totalMessages.length
        ? `<span style="font-size:10px;opacity:0.5;">${windowStart + 1}–${Math.min(windowStart + windowSize, totalMessages.length)} / ${totalMessages.length}</span>`
        : '';

    let html = `
        <div style="text-align:center; padding: 10px 0; display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;">
            <button onclick="window.goToFirstMessages()" ${isAtFirst ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtFirst?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtFirst?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ⏫ First
            </button>
            <button onclick="window.loadOlderMessages()" ${!canGoOlder ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoOlder?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoOlder?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ← Older
            </button>
            ${pageInfo}
            <button onclick="window.loadNewerMessages()" ${!canGoNewer ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoNewer?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoNewer?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Newer →
            </button>
            <button onclick="window.goToLatestMessages()" ${isAtLast ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtLast?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtLast?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Latest ⏬
            </button>
        </div>
    `;

    if (!msgs.length) {
        lunaMessages.innerHTML = html + `<div class="empty-state"><span>${lunaShowSaved ? '⭐' : '💬'}</span>${lunaShowSaved ? 'No saved messages' : 'No messages yet'}</div>`;
        return;
    }

    let lastDate = '';
    
    msgs.forEach(m => {
        const msgDate = formatDateSeparator(m.timestamp);
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${msgDate}</span></div>`;
            lastDate = msgDate;
        }

        let content = '';
        if (m.type === 'text') {
            content = escapeHtml(m.content);
        }

        const isLuna = m.sender === 'luna';
        let cls = isLuna ? 'luna-bubble' : 'admin-bubble-in-luna';
        let senderBadge = isLuna ? '' : '<span class="am-sender-badge" style="font-size:11px; font-weight:bold; color:#c9a0dc; display:block; margin-bottom:4px;">🛡️ Abdelrahman</span>';
        const reactionBadge = m.reaction ? `<div class="reaction-badge">${m.reaction}</div>` : '';
        const savedBadge = m.savedByLuna ? `<div class="saved-badge" style="font-size:10px; color:gold; margin-top:2px;">⭐ Saved</div>` : '';
        
        let actionBtns = `
            <div class="msg-actions" style="margin-top:5px; display:flex; gap:8px; opacity:0.6;">
                <button onclick="window.toggleSave(${m.id})" style="background:none; border:none; cursor:pointer; color:inherit;">${m.savedByLuna ? '⭐' : '☆'}</button>
                <button onclick="window.deleteMsg(${m.id})" style="background:none; border:none; cursor:pointer; color:inherit;">🗑️</button>
            </div>
        `;
        
        html += `
            <div class="message-row" style="display:flex; justify-content: ${isLuna ? 'flex-end' : 'flex-start'}; margin: 10px 0;">
                <div class="msg-bubble ${cls}" style="max-width:70%; padding:10px; border-radius:12px; background:${isLuna?'#5a4a6a':'#3a3a4a'}; color:#fff;">
                    ${senderBadge}
                    <div class="msg-content">${content}</div>
                    <div class="msg-time" style="font-size:10px; opacity:0.5; text-align:right; margin-top:4px;">${shortTime(m.timestamp)}</div>
                    ${savedBadge}
                    ${reactionBadge}
                    ${actionBtns}
                </div>
            </div>
        `;
    });
    
    lunaMessages.innerHTML = html;
}

/* ═══════════════ ADMIN — RENDER ═══════════════ */
function renderAdmin() {
    let msgs = getMessages();
    
    const canGoOlder  = windowStart > 0;
    const canGoNewer  = (windowStart + windowSize) < totalMessages.length;
    const isAtFirst   = windowStart === 0;
    const isAtLast    = !canGoNewer;
    const pageInfo    = totalMessages.length
        ? `<span style="font-size:10px;opacity:0.5;">${windowStart + 1}–${Math.min(windowStart + windowSize, totalMessages.length)} / ${totalMessages.length}</span>`
        : '';

    let html = `
        <div style="text-align:center; padding: 10px 0; display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;">
            <button onclick="window.goToFirstMessages()" ${isAtFirst ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtFirst?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtFirst?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ⏫ First
            </button>
            <button onclick="window.loadOlderMessages()" ${!canGoOlder ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoOlder?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoOlder?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ← Older
            </button>
            ${pageInfo}
            <button onclick="window.loadNewerMessages()" ${!canGoNewer ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoNewer?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoNewer?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Newer →
            </button>
            <button onclick="window.goToLatestMessages()" ${isAtLast ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtLast?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtLast?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Latest ⏬
            </button>
        </div>
    `;

    if (adminSearch && adminSearch.value.trim()) {
        const searchVal = adminSearch.value.toLowerCase();
        msgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(searchVal));
    }

    if (!msgs.length) {
        adminMessages.innerHTML = html + `<div class="empty-state">No messages found</div>`;
        return;
    }

    let lastDate = '';
    
    msgs.forEach(m => {
        const msgDate = formatDateSeparator(m.timestamp);
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${msgDate}</span></div>`;
            lastDate = msgDate;
        }

        const isAdmin = m.sender === 'admin';
        html += `
            <div class="message-row" style="display:flex; justify-content: ${isAdmin ? 'flex-end' : 'flex-start'}; margin: 10px 0;">
                <div class="msg-bubble" style="max-width:70%; padding:10px; border-radius:12px; background:${isAdmin?'#3a3a4a':'#5a4a6a'}; color:#fff;">
                    <span style="font-size:11px; opacity:0.7; display:block; margin-bottom:2px;">${isAdmin ? 'You' : 'Malak'}</span>
                    <div class="msg-content">${escapeHtml(m.content)}</div>
                    <div class="msg-time" style="font-size:10px; opacity:0.5; text-align:right; margin-top:4px;">${shortTime(m.timestamp)}</div>
                </div>
            </div>
        `;
    });
    
    adminMessages.innerHTML = html;
}

/* ═══════════════ GLOBAL BUTTON ACTIONS (MODULE COMPATIBLE) ═══════════════ */
window.deleteMsg = function(id) {
    set(ref(db, `messages/${id}/deletedByLuna`), true);
};

window.toggleSave = function(id) {
    // Search full list so it works regardless of which window page is shown
    const msg = totalMessages.find(m => m.id === id);
    if (msg) {
        set(ref(db, `messages/${id}/savedByLuna`), !msg.savedByLuna);
    }
};

// ─── Pagination Actions ────────────────────────────────────────────────

// Load 15 older messages (move window back)
window.loadOlderMessages = function() {
    if (windowStart === 0) return;
    donotScrollThisTime = true;
    isLiveMode = false;
    windowStart = Math.max(0, windowStart - windowSize);
    applyWindow();
    showToast("← Older messages loaded");
};

// Load 15 newer messages (move window forward)
window.loadNewerMessages = function() {
    if (windowStart + windowSize >= totalMessages.length) return;
    donotScrollThisTime = true;
    windowStart = Math.min(windowStart + windowSize, Math.max(0, totalMessages.length - windowSize));
    // If we've reached the very end, snap back to live mode
    if (windowStart + windowSize >= totalMessages.length) {
        isLiveMode = true;
        windowStart = Math.max(0, totalMessages.length - windowSize);
    }
    applyWindow();
    showToast("Newer messages →");
};

// Jump directly to the very first messages
window.goToFirstMessages = function() {
    if (windowStart === 0) return;
    donotScrollThisTime = true;
    isLiveMode = false;
    windowStart = 0;
    applyWindow();
    showToast("⏫ Showing first messages");
};

// Jump back to latest (live mode)
window.goToLatestMessages = function() {
    isLiveMode = true;
    windowStart = Math.max(0, totalMessages.length - windowSize);
    applyWindow();
    showToast("⏬ Back to latest messages");
    if (currentRole === 'luna') scrollLuna();
    else if (currentRole === 'admin') scrollAdmin();
};

// Keep old name for any lingering references
window.loadMoreMessages = window.loadOlderMessages;

// Auto scroll listeners
if (lunaScrollBottom) lunaScrollBottom.addEventListener('click', () => scrollLuna());
if (adminScrollBottom) adminScrollBottom.addEventListener('click', () => scrollAdmin());

/* ═══════════════ LUNA — TOGGLE SAVED VIEW ═══════════════ */
const lunaToggleSaved = $('lunaToggleSaved');
if (lunaToggleSaved) {
    lunaToggleSaved.addEventListener('click', () => {
        lunaShowSaved = !lunaShowSaved;
        lunaToggleSaved.textContent = lunaShowSaved ? '💬 All Messages' : '⭐ Preferred Messages';
        lunaToggleSaved.style.background = lunaShowSaved ? 'rgba(255,215,0,0.25)' : '';
        renderLunaMessages();
        if (!lunaShowSaved) scrollLuna();
    });
}

/* ═══════════════ ADMIN — TOGGLE DELETED / SAVED VIEWS ═══════════════ */
let adminShowDeleted = false;
let adminShowSaved   = false;

const adminToggleDeletedBtn = $('adminToggleDeletedBtn');
const adminToggleSavedBtn   = $('adminToggleSavedBtn');

if (adminToggleDeletedBtn) {
    adminToggleDeletedBtn.addEventListener('click', () => {
        adminShowDeleted = !adminShowDeleted;
        if (adminShowDeleted) adminShowSaved = false;
        adminToggleDeletedBtn.style.background = adminShowDeleted ? 'rgba(255,80,80,0.25)' : '';
        if (adminToggleSavedBtn) adminToggleSavedBtn.style.background = '';
        renderAdmin();
    });
}
if (adminToggleSavedBtn) {
    adminToggleSavedBtn.addEventListener('click', () => {
        adminShowSaved = !adminShowSaved;
        if (adminShowSaved) adminShowDeleted = false;
        adminToggleSavedBtn.style.background = adminShowSaved ? 'rgba(255,215,0,0.25)' : '';
        if (adminToggleDeletedBtn) adminToggleDeletedBtn.style.background = '';
        renderAdmin();
    });
}

// Patch renderAdmin to respect adminShowDeleted / adminShowSaved
const _origRenderAdmin = renderAdmin;
renderAdmin = function() {
    // Re-implement with filter awareness
    let msgs = getAllMessages();

    const canGoOlder = windowStart > 0;
    const canGoNewer = (windowStart + windowSize) < totalMessages.length;
    const isAtFirst  = windowStart === 0;
    const isAtLast   = !canGoNewer;
    const pageInfo   = totalMessages.length
        ? `<span style="font-size:10px;opacity:0.5;">${windowStart + 1}–${Math.min(windowStart + windowSize, totalMessages.length)} / ${totalMessages.length}</span>`
        : '';

    let html = `
        <div style="text-align:center; padding: 10px 0; display:flex; flex-wrap:wrap; gap:6px; justify-content:center; align-items:center;">
            <button onclick="window.goToFirstMessages()" ${isAtFirst ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtFirst?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtFirst?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ⏫ First
            </button>
            <button onclick="window.loadOlderMessages()" ${!canGoOlder ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoOlder?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoOlder?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                ← Older
            </button>
            ${pageInfo}
            <button onclick="window.loadNewerMessages()" ${!canGoNewer ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${!canGoNewer?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${!canGoNewer?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Newer →
            </button>
            <button onclick="window.goToLatestMessages()" ${isAtLast ? 'disabled' : ''}
                style="background: rgba(255,255,255,0.08); color:${isAtLast?'#888':'#fff'}; border: 1px solid rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 20px; cursor:${isAtLast?'default':'pointer'}; font-size: 11px; transition: 0.2s;">
                Latest ⏬
            </button>
        </div>
    `;

    // Apply view filters using the FULL list
    if (adminShowDeleted) {
        msgs = getAllMessages().filter(m => m.deletedByLuna);
    } else if (adminShowSaved) {
        msgs = getAllMessages().filter(m => m.savedByLuna);
    } else {
        // Normal view: use windowed slice + search
        msgs = getMessages();
        if (adminSearch && adminSearch.value.trim()) {
            const searchVal = adminSearch.value.toLowerCase();
            msgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(searchVal));
        }
    }

    if (!msgs.length) {
        adminMessages.innerHTML = html + `<div class="empty-state">No messages found</div>`;
        return;
    }

    let lastDate = '';
    msgs.forEach(m => {
        const msgDate = formatDateSeparator(m.timestamp);
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${msgDate}</span></div>`;
            lastDate = msgDate;
        }
        const isAdmin = m.sender === 'admin';
        const deletedLabel = m.deletedByLuna ? `<div style="font-size:10px;color:#ff8080;margin-top:2px;">🗑️ Deleted by Malak</div>` : '';
        const savedLabel   = m.savedByLuna   ? `<div style="font-size:10px;color:gold;margin-top:2px;">⭐ Saved</div>` : '';
        html += `
            <div class="message-row" style="display:flex; justify-content: ${isAdmin ? 'flex-end' : 'flex-start'}; margin: 10px 0;">
                <div class="msg-bubble" style="max-width:70%; padding:10px; border-radius:12px; background:${isAdmin?'#3a3a4a':'#5a4a6a'}; color:#fff;">
                    <span style="font-size:11px; opacity:0.7; display:block; margin-bottom:2px;">${isAdmin ? 'You' : 'Malak'}</span>
                    <div class="msg-content">${escapeHtml(m.content)}</div>
                    <div class="msg-time" style="font-size:10px; opacity:0.5; text-align:right; margin-top:4px;">${shortTime(m.timestamp)}</div>
                    ${deletedLabel}${savedLabel}
                </div>
            </div>
        `;
    });
    adminMessages.innerHTML = html;
};

/* ═══════════════ EMOJI PICKER ═══════════════ */
const emojiPicker      = $('emojiPicker');
const lunaEmojiToggle  = $('lunaEmojiToggle');
const stickerPicker    = $('stickerPicker');
const lunaStickerToggle= $('lunaStickerToggle');

function closeAllPickers() {
    if (emojiPicker)   emojiPicker.classList.add('hidden');
    if (stickerPicker) stickerPicker.classList.add('hidden');
}

if (lunaEmojiToggle) {
    lunaEmojiToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !emojiPicker.classList.contains('hidden');
        closeAllPickers();
        if (!open) emojiPicker.classList.remove('hidden');
    });
}

if (lunaEmojiToggle && emojiPicker) {
    emojiPicker.querySelectorAll('.emoji-item').forEach(span => {
        span.addEventListener('click', () => {
            lunaTextInput.value += span.textContent;
            lunaTextInput.focus();
            closeAllPickers();
        });
    });
}

/* ═══════════════ STICKER PICKER ═══════════════ */
if (lunaStickerToggle) {
    lunaStickerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !stickerPicker.classList.contains('hidden');
        closeAllPickers();
        if (!open) stickerPicker.classList.remove('hidden');
    });
}

// Send sticker on click
if (stickerPicker) {
    stickerPicker.querySelectorAll('.sticker-item').forEach(img => {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            const newId = nextId();
            const newMsg = {
                id: newId,
                sender: 'luna',
                type: 'sticker',
                content: img.src,
                timestamp: new Date().toISOString()
            };
            set(ref(db, `messages/${newId}`), newMsg);
            closeAllPickers();
        });
    });
}

// Custom sticker upload
const lunaStickerInput = $('lunaStickerInput');
if (lunaStickerInput) {
    lunaStickerInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const newId = nextId();
            const newMsg = {
                id: newId,
                sender: 'luna',
                type: 'sticker',
                content: reader.result,
                timestamp: new Date().toISOString()
            };
            set(ref(db, `messages/${newId}`), newMsg);
            closeAllPickers();
        };
        reader.readAsDataURL(file);
    });
}

// Close pickers when clicking elsewhere
document.addEventListener('click', () => closeAllPickers());

/* ═══════════════ FILE ATTACH (IMAGE / VIDEO / AUDIO) ═══════════════ */
const lunaFileInput      = $('lunaFileInput');
const lunaMediaPreview   = $('lunaMediaPreview');
const lunaPreviewContent = $('lunaPreviewContent');
const lunaPreviewClose   = $('lunaPreviewClose');
const lunaPreviewSend    = $('lunaPreviewSend');

let pendingFileData = null;
let pendingFileType = null;

if (lunaFileInput) {
    lunaFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            pendingFileData = reader.result;
            if (file.type.startsWith('image/')) {
                pendingFileType = 'image';
                lunaPreviewContent.innerHTML = `<img src="${reader.result}" style="max-width:100%;max-height:60vh;border-radius:8px;" />`;
            } else if (file.type.startsWith('video/')) {
                pendingFileType = 'video';
                lunaPreviewContent.innerHTML = `<video src="${reader.result}" controls style="max-width:100%;max-height:60vh;border-radius:8px;"></video>`;
            } else if (file.type.startsWith('audio/')) {
                pendingFileType = 'audio';
                lunaPreviewContent.innerHTML = `<audio src="${reader.result}" controls style="width:100%;"></audio>`;
            }
            lunaMediaPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        lunaFileInput.value = '';
    });
}

if (lunaPreviewClose) {
    lunaPreviewClose.addEventListener('click', () => {
        lunaMediaPreview.classList.add('hidden');
        pendingFileData = null;
        pendingFileType = null;
    });
}

if (lunaPreviewSend) {
    lunaPreviewSend.addEventListener('click', () => {
        if (!pendingFileData || !pendingFileType) return;
        const newId = nextId();
        const newMsg = {
            id: newId,
            sender: 'luna',
            type: pendingFileType,
            content: pendingFileData,
            timestamp: new Date().toISOString()
        };
        set(ref(db, `messages/${newId}`), newMsg);
        lunaMediaPreview.classList.add('hidden');
        pendingFileData = null;
        pendingFileType = null;
    });
}

/* ═══════════════ VOICE / VIDEO RECORD (lunaDynamicBtn) ═══════════════ */
const lunaDynamicBtn         = $('lunaDynamicBtn');
const recordingTimer         = $('recordingTimer');
const recordingPreviewContainer = $('recordingPreviewContainer');
const recordingPreview       = $('recordingPreview');
const flipCameraBtn          = $('flipCameraBtn');

let mediaRecorder   = null;
let recordedChunks  = [];
let recordingStream = null;
let recordingInterval = null;
let recordingSeconds  = 0;
let isRecordingVideo  = false;
let currentFacingMode = 'user';

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recordingStream) { recordingStream.getTracks().forEach(t => t.stop()); recordingStream = null; }
    clearInterval(recordingInterval);
    if (recordingTimer)  recordingTimer.classList.add('hidden');
    if (recordingPreviewContainer) recordingPreviewContainer.classList.add('hidden');
    // Reset button icon
    if (lunaDynamicBtn) {
        lunaDynamicBtn.innerHTML = `<svg class="icon-mic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`;
    }
}

function startRecordingTimer() {
    recordingSeconds = 0;
    if (recordingTimer) { recordingTimer.textContent = '0:00'; recordingTimer.classList.remove('hidden'); }
    recordingInterval = setInterval(() => {
        recordingSeconds++;
        const m = Math.floor(recordingSeconds / 60);
        const s = recordingSeconds % 60;
        if (recordingTimer) recordingTimer.textContent = `${m}:${s.toString().padStart(2,'0')}`;
    }, 1000);
}

async function startAudioRecording() {
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        isRecordingVideo = false;
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(recordingStream);
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                const newId = nextId();
                set(ref(db, `messages/${newId}`), { id: newId, sender: 'luna', type: 'audio', content: reader.result, timestamp: new Date().toISOString() });
            };
            reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        startRecordingTimer();
        if (lunaDynamicBtn) lunaDynamicBtn.innerHTML = `<span style="color:#ff6b6b;font-size:18px;">⏹</span>`;
        showToast('🎙️ Recording audio...');
    } catch(err) { showToast('Microphone access denied'); }
}

async function startVideoRecording() {
    try {
        recordingStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode }, audio: true });
        isRecordingVideo = true;
        recordedChunks = [];
        if (recordingPreview) { recordingPreview.srcObject = recordingStream; }
        if (recordingPreviewContainer) recordingPreviewContainer.classList.remove('hidden');
        mediaRecorder = new MediaRecorder(recordingStream);
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                const newId = nextId();
                set(ref(db, `messages/${newId}`), { id: newId, sender: 'luna', type: 'video', content: reader.result, timestamp: new Date().toISOString() });
            };
            reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        startRecordingTimer();
        if (lunaDynamicBtn) lunaDynamicBtn.innerHTML = `<span style="color:#ff6b6b;font-size:18px;">⏹</span>`;
        showToast('📹 Recording video...');
    } catch(err) { showToast('Camera access denied'); }
}

// Single tap = audio, long press = video
let pressTimer = null;
if (lunaDynamicBtn) {
    lunaDynamicBtn.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => { pressTimer = null; if (!mediaRecorder || mediaRecorder.state === 'inactive') startVideoRecording(); }, 600);
    });
    lunaDynamicBtn.addEventListener('mouseup', () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                startAudioRecording();
            } else {
                stopRecording();
            }
        } else {
            // Long press released = stop video
            if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
        }
    });
    lunaDynamicBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        pressTimer = setTimeout(() => { pressTimer = null; if (!mediaRecorder || mediaRecorder.state === 'inactive') startVideoRecording(); }, 600);
    });
    lunaDynamicBtn.addEventListener('touchend', e => {
        e.preventDefault();
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                startAudioRecording();
            } else {
                stopRecording();
            }
        } else {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') stopRecording();
        }
    });
}

if (flipCameraBtn) {
    flipCameraBtn.addEventListener('click', async () => {
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        if (mediaRecorder && mediaRecorder.state !== 'inactive' && isRecordingVideo) {
            mediaRecorder.stop();
            if (recordingStream) recordingStream.getTracks().forEach(t => t.stop());
            await startVideoRecording();
        }
    });
}

/* ═══════════════ EDIT MESSAGE MODAL ═══════════════ */
const editModal       = $('editModal');
const editMessageInput= $('editMessageInput');
const editModalClose  = $('editModalClose');
const editModalSave   = $('editModalSave');
let editingMsgId = null;

window.openEditModal = function(id, currentContent) {
    editingMsgId = id;
    editMessageInput.value = currentContent;
    editModal.classList.remove('hidden');
    editMessageInput.focus();
};

if (editModalClose) {
    editModalClose.addEventListener('click', () => {
        editModal.classList.add('hidden');
        editingMsgId = null;
    });
}

if (editModalSave) {
    editModalSave.addEventListener('click', () => {
        if (!editingMsgId) return;
        const newText = editMessageInput.value.trim();
        if (!newText) return;
        set(ref(db, `messages/${editingMsgId}/content`), newText)
            .then(() => { showToast('✏️ Message edited'); editModal.classList.add('hidden'); editingMsgId = null; })
            .catch(() => showToast('Error saving edit'));
    });
}

/* ═══════════════ LIGHTBOX ═══════════════ */
const lightbox      = $('lightbox');
const lightboxClose = $('lightboxClose');
const lightboxContent = $('lightboxContent');

window.openLightbox = function(html) {
    lightboxContent.innerHTML = html;
    lightbox.classList.remove('hidden');
};

if (lightboxClose) {
    lightboxClose.addEventListener('click', () => lightbox.classList.add('hidden'));
}
lightbox && lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.classList.add('hidden');
});

/* ═══════════════ MOOD / DAILY AFFIRMATION ═══════════════ */
const lunaMoodBtn = $('lunaMoodBtn');
const affirmations = [
    "You are enough, exactly as you are 🌸",
    "Today is going to be a beautiful day 💖",
    "You are loved more than you know ✨",
    "Your smile lights up the room 🌙",
    "You make the world a better place 🦋",
    "Believe in yourself — I do 💝",
    "You are strong, brave, and capable 🌺",
    "Every day you grow more amazing 🌟",
    "You deserve all the good things 🥰",
    "Your kindness changes lives 💫"
];

if (lunaMoodBtn) {
    lunaMoodBtn.addEventListener('click', () => {
        const msg = affirmations[Math.floor(Math.random() * affirmations.length)];
        showToast(msg);
    });
}

/* ═══════════════ INITIALIZATION ═══════════════ */
const session = getSession();
if (session && session.role) {
    showScreen(session.role);
} else {
    showScreen(null);
}