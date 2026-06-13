import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update, query, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

let globalMessages = [];
let lastSavedMessages = [];
let lunaProfile = { avatar: '', photoUrl: '', bio: '' };

// تعديل الليميت لـ 15 لسرعة التحميل الابتدائية
let currentMessagesLimit = 15;
let messagesListener = null;

function startMessagesSubscription(limit = 15) {
    currentMessagesLimit = limit;
    const messagesQuery = query(ref(db, 'messages'), limitToLast(currentMessagesLimit));
    
    if (typeof messagesListener === 'function') messagesListener();

    messagesListener = onValue(messagesQuery, (snapshot) => {
        const msgs = [];
        
        snapshot.forEach((child) => {
            let m = child.val();
            if (m && typeof m === 'object') {
                m._dbKey = child.key;
                msgs.push(m);
            }
        });

        globalMessages = msgs;
        lastSavedMessages = JSON.parse(JSON.stringify(globalMessages));

        if (currentRole === 'luna') {
            renderLunaMessages();
            scrollLuna();
        } else if (currentRole === 'admin') {
            renderAdmin();
            scrollAdmin();
        }
    });
}

// تشغيل الاشتراك الابتدائي بـ 15 رسالة فقط
startMessagesSubscription(15);

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

function nextId(msgs) {
    if (!msgs.length) return 1;
    let max = 0;
    for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].id > max) max = msgs[i].id;
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
    startMessagesSubscription(currentMessagesLimit);
    setTimeout(() => showToast("Data restored! ✨"), 600);
};

if (lunaRefresh) lunaRefresh.addEventListener('click', () => window.softRefresh());
if (adminRefresh) adminRefresh.addEventListener('click', () => window.softRefresh());

/* ═══════════════ MESSAGE SENDING LOGIC ═══════════════ */
function sendTextMessage(sender, text) {
    if (!text.trim()) return;
    const msgs = getMessages();
    const newId = nextId(msgs);
    
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
    let msgs = getMessages().filter(m => !m.deletedByLuna);
    
    if (lunaShowSaved) {
        msgs = msgs.filter(m => m.savedByLuna);
    }

    if (!msgs.length) {
        lunaMessages.innerHTML = `<div class="empty-state"><span>${lunaShowSaved ? '⭐' : '💬'}</span>${lunaShowSaved ? 'No saved messages' : 'No messages yet'}</div>`;
        return;
    }

    let html = '';
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
    
    if (adminSearch && adminSearch.value.trim()) {
        const searchVal = adminSearch.value.toLowerCase();
        msgs = msgs.filter(m => m.content && m.content.toLowerCase().includes(searchVal));
    }

    if (!msgs.length) {
        adminMessages.innerHTML = `<div class="empty-state">No messages found</div>`;
        return;
    }

    let html = '';
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
    const msg = globalMessages.find(m => m.id === id);
    if (msg) {
        set(ref(db, `messages/${id}/savedByLuna`), !msg.savedByLuna);
    }
};

// Auto scroll listeners
if (lunaScrollBottom) lunaScrollBottom.addEventListener('click', () => scrollLuna());
if (adminScrollBottom) adminScrollBottom.addEventListener('click', () => scrollAdmin());

/* ═══════════════ INITIALIZATION ═══════════════ */
const session = getSession();
if (session && session.role) {
    showScreen(session.role);
} else {
    showScreen(null);
}