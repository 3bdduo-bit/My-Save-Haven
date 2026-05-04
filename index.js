import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

onValue(ref(db, 'profile'), (snapshot) => {
    const data = snapshot.val();
    if (data) {
        lunaProfile = data;
        if (typeof updateProfileUI === 'function') updateProfileUI();
    }
});

onValue(ref(db, 'messages'), (snapshot) => {
    globalMessages = snapshot.val() || [];
    lastSavedMessages = JSON.parse(JSON.stringify(globalMessages));
    if (typeof currentRole !== 'undefined') {
        if (currentRole === 'luna') {
            if (typeof renderLunaMessages === 'function') renderLunaMessages();
            if (typeof scrollLuna === 'function') scrollLuna();
        } else if (currentRole === 'admin') {
            if (typeof renderAdmin === 'function') renderAdmin();
        }
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
const recordingTimer  = $('recordingTimer');
const lunaDynamicBtn  = $('lunaDynamicBtn');
const recordingPreviewContainer = $('recordingPreviewContainer');
const recordingPreview = $('recordingPreview');
const flipCameraBtn   = $('flipCameraBtn');
const lunaFileInput   = $('lunaFileInput');
const lunaLogout      = $('lunaLogout');
const lunaScrollBottom = $('lunaScrollBottom');
const heartsContainer = $('heartsContainer');
const lunaMediaPreview  = $('lunaMediaPreview');
const lunaPreviewContent = $('lunaPreviewContent');
const lunaPreviewClose  = $('lunaPreviewClose');
const lunaPreviewSend   = $('lunaPreviewSend');
const lunaToggleSaved   = $('lunaToggleSaved');
const lunaRefresh       = $('lunaRefresh');
const lunaMoodBtn       = $('lunaMoodBtn');
const lunaEmojiToggle   = $('lunaEmojiToggle');
const emojiPicker       = $('emojiPicker');
const lunaStickerToggle = $('lunaStickerToggle');
const stickerPicker     = $('stickerPicker');
const lunaStickerInput  = $('lunaStickerInput');

const malakWelcome    = $('malakWelcome');
const welcomeContinueBtn = $('welcomeContinueBtn');

const editModal       = $('editModal');
const editMessageInput= $('editMessageInput');
const editModalClose  = $('editModalClose');
const editModalSave   = $('editModalSave');

const adminDash       = $('adminDash');
const adminMessages   = $('adminMessages');
const adminSidebar    = $('adminSidebar');
const adminReplyInput = $('adminReplyInput');
const adminReplyBtn   = $('adminReplyBtn');
const adminLogout     = $('adminLogout');
const adminSearch     = $('adminSearch');
const adminToggleDeletedBtn = $('adminToggleDeletedBtn');
const adminToggleSavedBtn   = $('adminToggleSavedBtn');
const adminRefresh      = $('adminRefresh');
const adminScrollBottom = $('adminScrollBottom');

const lightbox        = $('lightbox');
const lightboxContent = $('lightboxContent');
const lightboxClose   = $('lightboxClose');

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
let pendingMedia = null;      // { type, dataUrl }
let adminPollTimer = null;
let editingMsgId = null;
let adminShowDeleted = false;
let adminShowSaved = false;
let lunaShowSaved = false;

/* ═══════════════ HELPERS ═══════════════ */
function getMessages() {
    return globalMessages || [];
}

function saveMessages(msgs) {
    if (!lastSavedMessages || msgs.length < lastSavedMessages.length) {
        set(ref(db, 'messages'), msgs);
        lastSavedMessages = JSON.parse(JSON.stringify(msgs));
        return;
    }
    
    let updates = {};
    let changed = false;
    
    // Only check the last 200 messages for changes to keep performance consistent
    const startIdx = Math.max(0, lastSavedMessages.length - 200);
    
    for (let i = startIdx; i < msgs.length; i++) {
        const m = msgs[i];
        const oldM = lastSavedMessages[i];
        
        if (!oldM) {
            updates[`${i}`] = m;
            changed = true;
        } else {
            for (const k in m) {
                if (m[k] !== oldM[k]) {
                    // Deeper check for objects/arrays (like reactions)
                    if (typeof m[k] === 'object' && m[k] !== null) {
                        if (JSON.stringify(m[k]) !== JSON.stringify(oldM[k])) {
                            updates[`${i}/${k}`] = m[k];
                            changed = true;
                        }
                    } else {
                        updates[`${i}/${k}`] = m[k];
                        changed = true;
                    }
                }
            }
        }
    }
    
    if (changed) {
        update(ref(db, 'messages'), updates).catch(err => console.error("Save failed", err));
        lastSavedMessages = JSON.parse(JSON.stringify(msgs));
    }
}

function nextId(msgs) {
    if (!msgs.length) return 1;
    let max = 0;
    for (let i = 0; i < msgs.length; i++) {
        if (msgs[i].id > max) max = msgs[i].id;
    }
    return max + 1;
}

function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
        month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true
    });
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
    if (adminPollTimer) { clearInterval(adminPollTimer); adminPollTimer = null; }

    // Smooth transition logic is handled by CSS (opacity/visibility)
    setTimeout(() => {
        if (role === 'luna') {
            if (typeof updateProfileUI === 'function') updateProfileUI();
            if (malakWelcome) {
                malakWelcome.classList.remove('hidden');
                // Removed 3s timeout. Now wait for button click.
                if (welcomeContinueBtn) {
                    welcomeContinueBtn.onclick = () => {
                        malakWelcome.classList.add('hidden');
                        lunaChat.classList.remove('hidden');
                        renderLunaMessages();
                        scrollLuna();
                    };
                }
            } else {
                lunaChat.classList.remove('hidden');
                renderLunaMessages();
                scrollLuna();
            }
        } else if (role === 'admin') {
            adminDash.classList.remove('hidden');
            renderAdmin();
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
    // Topbar update
    lunaTopBio.textContent = lunaProfile.bio || "Make your own bio";
    
    if (lunaProfile.photoUrl) {
        lunaTopAvatar.innerHTML = `<img src="${lunaProfile.photoUrl}" />`;
    } else if (lunaProfile.avatar) {
        lunaTopAvatar.innerHTML = `<span class="avatar-emoji">${lunaProfile.avatar}</span>`;
    } else {
        lunaTopAvatar.innerHTML = `<span style="font-size: 10px; text-align: center; line-height: 1.1; color: #fff; padding: 2px;">Make your<br>own avatar</span>`;
    }

    // Modal update
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
        updateProfileUI(); // revert any unsaved changes
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
if (lunaRefresh) lunaRefresh.addEventListener('click', () => window.location.reload());
if (adminRefresh) adminRefresh.addEventListener('click', () => window.location.reload());

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

    const MAX_LUNA_RENDER = 150;
    const hasMore = msgs.length > MAX_LUNA_RENDER;
    const displayMsgs = msgs.slice(-MAX_LUNA_RENDER);

    let html = '';
    if (hasMore) {
        html += `<div class="load-more-container"><button class="load-more-btn" onclick="renderAllLuna()">Show older messages (${msgs.length - MAX_LUNA_RENDER} more)</button></div>`;
    }

    let lastDate = '';
    displayMsgs.forEach(m => {
        const msgDate = formatDateSeparator(m.timestamp);
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${msgDate}</span></div>`;
            lastDate = msgDate;
        }

        let content = '';
        if (m.type === 'text') {
            content = escapeHtml(m.content);
        } else if (m.type === 'sticker') {
            content = `<img src="${m.mediaUrl}" alt="sticker" loading="lazy" class="sticker-msg-img" />`;
        } else if (m.type === 'image') {
            content = `<img src="${m.mediaUrl}" alt="image" loading="lazy"/>`;
        } else if (m.type === 'video') {
            content = `<video src="${m.mediaUrl}" controls playsinline></video>`;
        } else if (m.type === 'audio') {
            const isLuna = m.sender === 'luna';
            const iconColor = isLuna ? '#fff' : '#c9a0dc';
            content = `<div class="custom-audio-player">
                <div class="audio-icon" style="color: ${iconColor}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
                <audio src="${m.mediaUrl}" controls style="height:30px; width:160px; filter: ${isLuna ? 'invert(1) brightness(2)' : 'none'};"></audio>
                <span class="audio-duration-tag">${m.duration || ''}</span>
            </div>`;
        } else if (m.type === 'heart-bot') {
            content = `<div style="font-size: 70px; text-align: center; animation: gentleBounce 2s infinite; filter: drop-shadow(0 0 10px rgba(255,105,180,0.6));">❤️</div><div style="margin-top: 15px; font-size: 16px; font-weight: bold; text-align: center; color: #d65076; font-family: 'Quicksand', sans-serif;">You deserve a big heart because of your beauty</div>`;
        }

        const isLuna = m.sender === 'luna';
        let cls = isLuna ? 'luna-bubble' : 'admin-bubble-in-luna';
        let senderBadge = isLuna ? '' : '<span class="am-sender-badge">🛡️ Admin Reply</span>';
        const readReceipt = '';
        const reactionBadge = m.reaction ? `<div class="reaction-badge" onclick="toggleReaction(${m.id}, event)">${m.reaction}</div>` : '';
        const savedBadge = m.savedByLuna ? `<div class="saved-badge">⭐ Saved</div>` : '';
        
        if (m.type === 'heart-bot') {
            cls = 'heart-bot-bubble';
            senderBadge = '';
        } else if (m.type === 'sticker') {
            cls += ' sticker-bubble';
        }
        
        let actionBtns = '';
        const saveIcon = m.savedByLuna ? '⭐' : '☆';
        if (isLuna && m.type === 'text') {
            actionBtns = `<div class="msg-actions">
                <button onclick="toggleSave(${m.id})" title="Save">${saveIcon}</button>
                <button onclick="openEditModal(${m.id})" title="Edit">✎</button>
                <button onclick="deleteMsg(${m.id})" title="Delete">🗑️</button>
            </div>`;
        } else {
            actionBtns = `<div class="msg-actions">
                <button onclick="toggleSave(${m.id})" title="Save">${saveIcon}</button>
                <button onclick="deleteMsg(${m.id})" title="Delete">🗑️</button>
            </div>`;
        }

        let timeRow = '';
        if (m.type === 'heart-bot') {
            timeRow = `<div class="msg-time">${fmtTime(m.timestamp)}</div>`;
        } else {
            timeRow = `<div style="display:flex; justify-content:space-between; align-items:center;">
                <span></span>
                <span class="msg-time">${fmtTime(m.timestamp)} ${readReceipt}</span>
            </div>`;
        }

        html += `<div class="${cls}" data-id="${m.id}" ondblclick="toggleReaction(${m.id}, event)">
            ${senderBadge}
            ${content}
            ${timeRow}
            ${actionBtns}
            ${reactionBadge}
            ${savedBadge}
        </div>`;
    });
    lunaMessages.innerHTML = html;
}

function scrollLuna() {
    requestAnimationFrame(() => { lunaMessages.scrollTop = lunaMessages.scrollHeight; });
}

/* ═══════════════ LUNA — ACTIONS (EDIT / DELETE) ═══════════════ */
window.deleteMsg = function(id) {
    const msgs = getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) {
        msgs[idx].deletedByLuna = true;
        saveMessages(msgs);
        renderLunaMessages();
    }
};

window.toggleSave = function(id) {
    const msgs = getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) {
        msgs[idx].savedByLuna = !msgs[idx].savedByLuna;
        saveMessages(msgs);
        if (currentRole === 'luna') renderLunaMessages();
        if (currentRole === 'admin') renderAdmin();
    }
};

window.openEditModal = function(id) {
    const msgs = getMessages();
    const msg = msgs.find(m => m.id === id);
    if (msg && msg.type === 'text') {
        editingMsgId = id;
        editMessageInput.value = msg.content;
        editModal.classList.remove('hidden');
        editMessageInput.focus();
    }
};

editModalClose.addEventListener('click', () => {
    editModal.classList.add('hidden');
    editingMsgId = null;
});

editModalSave.addEventListener('click', () => {
    if (!editingMsgId) return;
    const newContent = editMessageInput.value.trim();
    if (newContent) {
        const msgs = getMessages();
        const idx = msgs.findIndex(m => m.id === editingMsgId);
        if (idx !== -1) {
            msgs[idx].content = newContent;
            msgs[idx].timestamp = new Date().toISOString(); // optionally update time
            saveMessages(msgs);
            renderLunaMessages();
        }
    }
    editModal.classList.add('hidden');
    editingMsgId = null;
});

editMessageInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') editModalSave.click();
});

/* ═══════════════ LUNA — SEND TEXT ═══════════════ */
function lunaSendText() {
    const text = lunaTextInput.value.trim();
    if (!text) return;
    const msgs = getMessages();
    msgs.push({
        id: nextId(msgs), sender:'luna', type:'text',
        content: text, timestamp: new Date().toISOString(),
        mediaUrl: null, deletedByLuna: false
    });
    
    // Automated reply for heart emojis
    const heartEmojis = ['❤️','🩷','🧡','💛','💚','💙','🩵','💜','🤎','🖤','🩶','🤍','💘','💝','💖','💗','💓','💞','💕','💟','❣️','🫶'];
    if (heartEmojis.some(emoji => text.includes(emoji))) {
        const hId = nextId(msgs);
        msgs.push({
            id: hId, sender:'admin', type:'heart-bot',
            content: '', timestamp: new Date().toISOString(),
            mediaUrl: null, deletedByLuna: false
        });
    }

    saveMessages(msgs);
    lunaTextInput.value = '';
    lunaTextInput.style.height = 'auto';
    renderLunaMessages();
    scrollLuna();
    spawnHearts();
    updateDynamicBtn();
}

let lunaFullRender = false;
window.renderAllLuna = function() {
    lunaFullRender = true;
    renderLunaMessages();
};

lunaTextInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        lunaSendText();
    }
});
lunaTextInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    updateDynamicBtn();
});

/* ═══════════════ LUNA — ATTACH MEDIA ═══════════════ */
function handleFileSelect(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const isVideo = file.type.startsWith('video');
        const isAudio = file.type.startsWith('audio');
        let type = 'image';
        if (isVideo) type = 'video';
        if (isAudio) type = 'audio';

        pendingMedia = { type, dataUrl: reader.result };
        
        if (isVideo) {
            lunaPreviewContent.innerHTML = `<video src="${reader.result}" controls style="max-width:100%;max-height:50vh;border-radius:12px"></video>`;
        } else if (isAudio) {
            lunaPreviewContent.innerHTML = `<audio src="${reader.result}" controls style="width:100%; margin:20px 0; outline:none;"></audio>`;
        } else {
            lunaPreviewContent.innerHTML = `<img src="${reader.result}" style="max-width:100%;max-height:50vh;border-radius:12px"/>`;
        }
        lunaMediaPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

lunaFileInput.addEventListener('change', e => {
    handleFileSelect(e.target.files[0]);
    lunaFileInput.value = '';
});

// Drag and drop for media
lunaChat.addEventListener('dragover', e => { e.preventDefault(); lunaChat.classList.add('drag-active'); });
lunaChat.addEventListener('dragleave', e => { e.preventDefault(); lunaChat.classList.remove('drag-active'); });
lunaChat.addEventListener('drop', e => {
    e.preventDefault();
    lunaChat.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'))) {
        handleFileSelect(file);
    }
});

/* ═══════════════ LUNA — MEDIA RECORDING ═══════════════ */
let mediaRecorder = null;
let recordedChunks = [];
let recordingStream = null;
let currentFacingMode = 'user'; // Front camera by default
let isRecording = false;
let recordingType = null;
let recordingStartTime = 0;
let recordingInterval = null;

function updateTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    recordingTimer.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function startRecording(type) {
    if (isRecording) return;
    try {
        const constraints = type === 'video' ? { video: { facingMode: currentFacingMode }, audio: true } : { audio: true };
        recordingStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        recordingType = type;
        isRecording = true;
        recordingStartTime = Date.now();

        if (type === 'video') {
            recordingPreview.srcObject = recordingStream;
            if (currentFacingMode === 'user') {
                recordingPreview.classList.add('mirrored');
            } else {
                recordingPreview.classList.remove('mirrored');
            }
            recordingPreviewContainer.classList.remove('hidden');
        }
        lunaDynamicBtn.classList.add('recording');
        lunaTextInput.classList.add('hidden');
        recordingTimer.classList.remove('hidden');
        recordingTimer.textContent = '0:00';
        recordingInterval = setInterval(updateTimer, 1000);

        mediaRecorder = new MediaRecorder(recordingStream);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
            clearInterval(recordingInterval);
            const finalDuration = recordingTimer.textContent;
            
            const blob = new Blob(recordedChunks, { type: type === 'video' ? 'video/webm' : 'audio/webm' });
            if (recordingStream) {
                recordingStream.getTracks().forEach(track => track.stop());
            }
            recordingStream = null;
            isRecording = false;
            recordingPreviewContainer.classList.add('hidden');
            recordingPreview.srcObject = null;
            lunaDynamicBtn.classList.remove('recording');
            lunaTextInput.classList.remove('hidden');
            recordingTimer.classList.add('hidden');
            
            // Only send if recording is > 500ms
            if (Date.now() - recordingStartTime > 500 && recordedChunks.length > 0) {
                const reader = new FileReader();
                reader.onload = () => {
                    const msgs = getMessages();
                    msgs.push({
                        id: nextId(msgs), sender:'luna', type: type,
                        content: '', timestamp: new Date().toISOString(),
                        mediaUrl: reader.result, deletedByLuna: false,
                        duration: finalDuration
                    });
                    saveMessages(msgs);
                    renderLunaMessages();
                    scrollLuna();
                    spawnHearts();
                };
                reader.readAsDataURL(blob);
            }
        };
        
        mediaRecorder.start();
    } catch (err) {
        alert('Microphone/Camera access denied or unavailable.');
        isRecording = false;
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// ═══════════════ DYNAMIC BUTTON LOGIC ═══════════════
const SVGS = {
    voice: `<svg class="icon-mic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>`,
    video: `<svg class="icon-video" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    send: `<svg class="icon-send" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`
};

let currentMediaMode = 'voice'; // 'voice' or 'video'
let btnHoldTimer = null;
let isBtnHeld = false;

function updateDynamicBtn() {
    const text = lunaTextInput.value.trim();
    if (text) {
        lunaDynamicBtn.innerHTML = SVGS.send;
        lunaDynamicBtn.title = "Send";
    } else {
        lunaDynamicBtn.innerHTML = SVGS[currentMediaMode];
        lunaDynamicBtn.title = currentMediaMode === 'voice' ? 'Record Voice' : 'Record Video Note';
    }
}

function setupDynamicBtn() {
    if (!lunaDynamicBtn) return;
    
    const startAction = (e) => {
        if (e.type === 'pointerdown' && e.button !== 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        
        const text = lunaTextInput.value.trim();
        if (text) return; // If text is present, do nothing on mousedown
        
        lunaDynamicBtn.setPointerCapture(e.pointerId);
        isBtnHeld = false;
        
        // Wait 300ms to distinguish between tap (toggle) and hold (record)
        btnHoldTimer = setTimeout(() => {
            isBtnHeld = true;
            startRecording(currentMediaMode === 'voice' ? 'audio' : 'video');
        }, 300);
    };

    const stopAction = (e) => {
        if (lunaDynamicBtn.hasPointerCapture(e.pointerId)) {
            lunaDynamicBtn.releasePointerCapture(e.pointerId);
        }
        
        clearTimeout(btnHoldTimer);
        
        const text = lunaTextInput.value.trim();
        if (text) {
            if (e.type === 'pointerup') lunaSendText();
            return;
        }

        if (isBtnHeld) {
            // It was a hold -> stop recording
            stopRecording();
        } else if (e.type === 'pointerup') {
            // It was a short tap -> toggle mode
            currentMediaMode = currentMediaMode === 'voice' ? 'video' : 'voice';
            updateDynamicBtn();
        }
        isBtnHeld = false;
    };

    lunaDynamicBtn.addEventListener('pointerdown', startAction);
    lunaDynamicBtn.addEventListener('pointerup', stopAction);
    lunaDynamicBtn.addEventListener('pointercancel', stopAction);
}

setupDynamicBtn();

if (flipCameraBtn) {
    flipCameraBtn.addEventListener('click', async () => {
        // Toggle camera
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        // If currently recording video, we need to restart the stream
        if (isRecording && recordingType === 'video' && recordingStream) {
            // Stop old video track
            const oldVideoTrack = recordingStream.getVideoTracks()[0];
            if (oldVideoTrack) oldVideoTrack.stop();
            
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
                const newVideoTrack = newStream.getVideoTracks()[0];
                
                // Remove old, add new
                if (oldVideoTrack) recordingStream.removeTrack(oldVideoTrack);
                recordingStream.addTrack(newVideoTrack);
                
                // Update preview mirroring
                if (currentFacingMode === 'user') {
                    recordingPreview.classList.add('mirrored');
                } else {
                    recordingPreview.classList.remove('mirrored');
                }
            } catch (err) {
                console.error("Failed to flip camera", err);
            }
        }
    });
}

lunaPreviewClose.addEventListener('click', () => {
    lunaMediaPreview.classList.add('hidden');
    pendingMedia = null;
});

lunaPreviewSend.addEventListener('click', () => {
    if (!pendingMedia) return;
    const msgs = getMessages();
    msgs.push({
        id: nextId(msgs), sender:'luna', type: pendingMedia.type,
        content: '', timestamp: new Date().toISOString(),
        mediaUrl: pendingMedia.dataUrl, deletedByLuna: false
    });
    saveMessages(msgs);
    pendingMedia = null;
    lunaMediaPreview.classList.add('hidden');
    renderLunaMessages();
    scrollLuna();
    spawnHearts();
});

/* ═══════════════ LUNA — HEARTS ═══════════════ */
function spawnHearts() {
    const emojis = ['💗','💕','✨','💜','🩷'];
    for (let i = 0; i < 6; i++) {
        const el = document.createElement('span');
        el.className = 'heart-particle';
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        el.style.left = (40 + Math.random() * 40) + '%';
        el.style.bottom = '80px';
        el.style.animationDelay = (i * 0.08) + 's';
        heartsContainer.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    }
}

/* ═══════════════ ADMIN — RENDER ═══════════════ */
function renderAdmin(filter) {
    const search = (filter !== undefined ? filter : adminSearch.value).toLowerCase();
    const msgs = getMessages();

    // Mark Luna's messages as read (optimized check)
    let changed = false;
    const checkStart = Math.max(0, msgs.length - 100);
    for (let i = checkStart; i < msgs.length; i++) {
        const m = msgs[i];
        if (m.sender === 'luna' && !m.read) {
            m.read = true;
            changed = true;
        }
    }
    if (changed) {
        // Small delay to ensure render finishes first
        setTimeout(() => saveMessages(msgs), 50);
    }

    // Sidebar — luna messages only
    const lunaOnly = msgs.filter(m => m.sender === 'luna');
    adminSidebar.innerHTML = lunaOnly.length
        ? lunaOnly.slice().reverse().map(m => {
            const preview = m.type === 'text' ? m.content : `[${m.type}]`;
            return `<div class="sidebar-item" data-id="${m.id}">
                <div class="si-sender">Malak ${m.deletedByLuna ? '<span style="color:#e74c6f;font-size:10px;margin-left:4px;">(Deleted)</span>' : ''}</div>
                <div class="si-preview">${escapeHtml(preview)}</div>
                <div class="si-time">${fmtTime(m.timestamp)}</div>
            </div>`;
        }).join('')
        : '<div style="padding:24px;color:#bbb;text-align:center">No messages yet</div>';

    // Main area — all messages, filtered
    const filtered = msgs.filter(m => {
        // Filter by Deleted status
        if (adminShowDeleted) {
            if (!m.deletedByLuna) return false;
        } else if (adminShowSaved) {
            if (!m.savedByLuna || m.deletedByLuna) return false;
        } else {
            if (m.deletedByLuna) return false;
        }

        if (!search) return true;
        return (m.content && m.content.toLowerCase().includes(search))
            || m.sender.toLowerCase().includes(search)
            || m.type.toLowerCase().includes(search);
    });

    if (!filtered.length) {
        adminMessages.innerHTML = '<div class="empty-state"><span>📭</span>No messages found</div>';
        return;
    }

    const MAX_ADMIN_RENDER = 200;
    const hasMore = filtered.length > MAX_ADMIN_RENDER && !adminFullRender && !search;
    const displayMsgs = hasMore ? filtered.slice(-MAX_ADMIN_RENDER) : filtered;

    let html = '';
    if (hasMore) {
        html += `<div class="load-more-container"><button class="load-more-btn" onclick="renderAllAdmin()">Show older messages (${filtered.length - MAX_ADMIN_RENDER} more)</button></div>`;
    }

    let lastDate = '';
    displayMsgs.forEach(m => {
        const msgDate = formatDateSeparator(m.timestamp);
        if (msgDate !== lastDate) {
            html += `<div class="date-separator"><span>${msgDate}</span></div>`;
            lastDate = msgDate;
        }
        
        const isLuna = m.sender === 'luna';
        let cls = isLuna ? 'luna-sent' : 'admin-reply';
        let senderLabel = isLuna ? '👸🏻 Malak' : '🛡️ Admin';

        if (m.type === 'heart-bot') {
            cls = 'heart-bot-bubble-admin';
            senderLabel = '✨ Automated';
        }

        let content = '';
        if (m.type === 'text') {
            content = escapeHtml(m.content);
        } else if (m.type === 'sticker') {
            content = `<img src="${m.mediaUrl}" alt="sticker" loading="lazy" class="sticker-msg-img" />`;
            cls += ' sticker-bubble';
        } else if (m.type === 'image') {
            content = `<img src="${m.mediaUrl}" alt="image" loading="lazy"/>`;
        } else if (m.type === 'video') {
            content = `<video src="${m.mediaUrl}" controls playsinline></video>`;
        } else if (m.type === 'audio') {
            const isLuna = m.sender === 'luna';
            content = `<div class="custom-audio-player admin-audio">
                <div class="audio-icon" style="color: #c9a0dc">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                </div>
                <audio src="${m.mediaUrl}" controls style="height:28px; width:150px;"></audio>
                <span class="audio-duration-tag" style="color: #888;">${m.duration || ''}</span>
            </div>`;
        } else if (m.type === 'heart-bot') {
            content = `<div style="font-size: 30px; text-align: center;">❤️</div><div style="margin-top: 5px; font-weight: bold; text-align: center; font-size: 13px;">You deserve a big heart because of your beauty</div>`;
        }
        const reactionBadge = m.reaction ? `<div class="reaction-badge" onclick="toggleReaction(${m.id}, event)">${m.reaction}</div>` : '';
        const savedBadge = m.savedByLuna ? `<div class="saved-badge">⭐ Saved by Malak</div>` : '';

        html += `<div class="admin-msg ${cls}" data-id="${m.id}" ondblclick="toggleReaction(${m.id}, event)">
            <div class="am-sender">${senderLabel} ${m.deletedByLuna ? '<span style="color:#e74c6f;font-size:10px;margin-left:4px;">(Deleted by Malak)</span>' : ''}</div>
            ${content}
            <div class="am-time">
                <span>${fmtTime(m.timestamp)}</span>
                ${isLuna ? `<span style="color:#888;font-size:10px;">${m.read ? 'Read ✓✓' : 'Delivered ✓'}</span>` : ''}
            </div>
            ${reactionBadge}
            ${savedBadge}
        </div>`;
    });
    adminMessages.innerHTML = html;
    if (!hasMore) adminMessages.scrollTop = adminMessages.scrollHeight;
}

let adminFullRender = false;
window.renderAllAdmin = function() {
    adminFullRender = true;
    renderAdmin();
};

adminSearch.addEventListener('input', () => renderAdmin());

if (adminToggleDeletedBtn) {
    adminToggleDeletedBtn.addEventListener('click', () => {
        adminShowDeleted = !adminShowDeleted;
        adminShowSaved = false; // mutually exclusive
        adminToggleDeletedBtn.textContent = adminShowDeleted ? '💬 Active Chat' : '🗑️ Deleted';
        adminToggleDeletedBtn.style.background = adminShowDeleted ? '#e8f5e9' : '#e8eaf6';
        adminToggleDeletedBtn.style.color = adminShowDeleted ? '#2e7d32' : '#5c6bc0';
        
        // Reset Saved button
        adminToggleSavedBtn.classList.remove('active');
        adminToggleSavedBtn.textContent = '⭐ Saved';
        adminToggleSavedBtn.style.background = '#e8eaf6';
        adminToggleSavedBtn.style.color = '#5c6bc0';
        
        renderAdmin();
    });
}

if (adminToggleSavedBtn) {
    adminToggleSavedBtn.addEventListener('click', () => {
        adminShowSaved = !adminShowSaved;
        adminShowDeleted = false; // mutually exclusive
        adminToggleSavedBtn.classList.toggle('active', adminShowSaved);
        adminToggleSavedBtn.textContent = adminShowSaved ? '💬 Active Chat' : '⭐ Saved';
        adminToggleSavedBtn.style.background = adminShowSaved ? '#fff9c4' : '#e8eaf6';
        adminToggleSavedBtn.style.color = adminShowSaved ? '#fbc02d' : '#5c6bc0';
        
        // Reset Deleted button
        adminToggleDeletedBtn.textContent = '🗑️ Deleted';
        adminToggleDeletedBtn.style.background = '#e8eaf6';
        adminToggleSavedBtn.style.color = '#5c6bc0';
        
        renderAdmin();
    });
}

if (lunaToggleSaved) {
    lunaToggleSaved.addEventListener('click', () => {
        lunaShowSaved = !lunaShowSaved;
        lunaToggleSaved.classList.toggle('active', lunaShowSaved);
        
        // Update text and style to be responsive like admin buttons
        lunaToggleSaved.innerHTML = lunaShowSaved ? '💬 Back to Chat' : '⭐ Preferred Messages';
        lunaToggleSaved.style.background = lunaShowSaved ? 'rgba(255,255,255,0.7)' : 'rgba(255,215,0,0.05)';
        lunaToggleSaved.style.color = lunaShowSaved ? '#c9a0dc' : '#b0a0c0';
        lunaToggleSaved.style.borderColor = lunaShowSaved ? '#c9a0dc' : 'rgba(255,215,0,0.2)';
        
        renderLunaMessages();
    });
}

/* Sidebar click scrolls to message */
adminSidebar.addEventListener('click', e => {
    const item = e.target.closest('.sidebar-item');
    if (!item) return;
    const id = item.dataset.id;
    const msgs = getMessages();
    const msg = msgs.find(m => m.id == id);
    
    // Auto-switch view if needed
    if (msg) {
        if (msg.deletedByLuna && !adminShowDeleted) {
            adminToggleDeletedBtn.click();
        } else if (!msg.deletedByLuna && adminShowDeleted) {
            adminToggleDeletedBtn.click();
        }
    }

    setTimeout(() => {
        const el = adminMessages.querySelector(`.admin-msg[data-id="${id}"]`);
        if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
    }, 100);
});

/* ═══════════════ ADMIN — REPLY ═══════════════ */
function adminSendReply() {
    const text = adminReplyInput.value.trim();
    if (!text) return;
    const msgs = getMessages();
    msgs.push({
        id: nextId(msgs), sender:'admin', type:'text',
        content: text, timestamp: new Date().toISOString(),
        mediaUrl: null, deletedByLuna: false
    });
    saveMessages(msgs);
    adminReplyInput.value = '';
    renderAdmin();
}

adminReplyBtn.addEventListener('click', adminSendReply);
adminReplyInput.addEventListener('keydown', e => { if (e.key === 'Enter') adminSendReply(); });

/* ═══════════════ GLOBAL LIGHTBOX ═══════════════ */
document.addEventListener('click', e => {
    if (e.target.tagName === 'IMG' && (e.target.closest('.luna-bubble') || e.target.closest('.admin-msg') || e.target.closest('.admin-bubble-in-luna'))) {
        lightboxContent.innerHTML = `<img src="${e.target.src}" style="max-width:100%; max-height:85vh; border-radius:12px;"/>`;
        lightbox.classList.remove('hidden');
    } else if (e.target.tagName === 'VIDEO' && (e.target.closest('.luna-bubble') || e.target.closest('.admin-msg') || e.target.closest('.admin-bubble-in-luna'))) {
        lightboxContent.innerHTML = `<video src="${e.target.src}" controls autoplay style="max-width:100%; max-height:85vh; border-radius:12px;"></video>`;
        lightbox.classList.remove('hidden');
    }
});
lightboxClose.addEventListener('click', () => {
    lightbox.classList.add('hidden');
    lightboxContent.innerHTML = ''; // stop video
});

/* ═══════════════ NEW FEATURES ═══════════════ */
window.toggleReaction = function(id, e) {
    if (e) e.stopPropagation();
    const msgs = getMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx !== -1) {
        msgs[idx].reaction = msgs[idx].reaction ? null : '❤️';
        saveMessages(msgs);
        if (currentRole === 'luna') renderLunaMessages();
        if (currentRole === 'admin') renderAdmin();
    }
};

function handleScrollBtn(container, btn) {
    if (!btn || !container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isAtBottom) btn.classList.remove('visible');
    else btn.classList.add('visible');
}
lunaMessages.addEventListener('scroll', () => handleScrollBtn(lunaMessages, lunaScrollBottom));
adminMessages.addEventListener('scroll', () => handleScrollBtn(adminMessages, adminScrollBottom));

if(lunaScrollBottom) {
    lunaScrollBottom.addEventListener('click', () => {
        lunaMessages.scrollTo({ top: lunaMessages.scrollHeight, behavior: 'smooth' });
    });
}
if(adminScrollBottom) {
    adminScrollBottom.addEventListener('click', () => {
        adminMessages.scrollTo({ top: adminMessages.scrollHeight, behavior: 'smooth' });
    });
}

/* ═══════════════ NEW UI EVENTS ═══════════════ */
const affirmations = [
    "You are doing great today! 🌸",
    "Your smile lights up the world! ✨",
    "Take a deep breath, you are safe here. 🦋",
    "You are beautiful inside and out! 💖",
    "Never forget how special you are. 🥰"
];

if (lunaMoodBtn) {
    lunaMoodBtn.addEventListener('click', () => {
        const randomMsg = affirmations[Math.floor(Math.random() * affirmations.length)];
        showToast(randomMsg);
    });
}

if (lunaEmojiToggle && emojiPicker) {
    lunaEmojiToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('hidden');
        if (stickerPicker) stickerPicker.classList.add('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== lunaEmojiToggle && !lunaEmojiToggle.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });
    
    emojiPicker.querySelectorAll('.emoji-item').forEach(item => {
        item.addEventListener('click', () => {
            lunaTextInput.value += item.textContent;
            emojiPicker.classList.add('hidden');
            lunaTextInput.focus();
            if (typeof updateDynamicBtn === 'function') updateDynamicBtn();
        });
    });
}

function sendSticker(url) {
    const msgs = getMessages();
    msgs.push({
        id: nextId(msgs), sender:'luna', type:'sticker',
        content: '', timestamp: new Date().toISOString(),
        mediaUrl: url, deletedByLuna: false
    });
    saveMessages(msgs);
    renderLunaMessages();
    scrollLuna();
    spawnHearts();
    if (stickerPicker) stickerPicker.classList.add('hidden');
}

if (lunaStickerToggle && stickerPicker) {
    lunaStickerToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        stickerPicker.classList.toggle('hidden');
        if (emojiPicker) emojiPicker.classList.add('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!stickerPicker.contains(e.target) && e.target !== lunaStickerToggle && !lunaStickerToggle.contains(e.target)) {
            stickerPicker.classList.add('hidden');
        }
    });
    
    stickerPicker.querySelectorAll('.sticker-item').forEach(item => {
        item.addEventListener('click', () => {
            sendSticker(item.src);
        });
    });
}

if (lunaStickerInput) {
    lunaStickerInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            sendSticker(reader.result);
        };
        reader.readAsDataURL(file);
        lunaStickerInput.value = '';
    });
}

/* ═══════════════ UTIL ═══════════════ */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ═══════════════ INIT ═══════════════ */
(function init() {
    const session = getSession();
    if (session && session.role) {
        showScreen(session.role);
    } else {
        showScreen(null);
    }
    if (typeof updateDynamicBtn === 'function') updateDynamicBtn();
})();
