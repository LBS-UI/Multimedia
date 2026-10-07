/* Multi Media Club scripts */
        // =============================================
        // COMPLETE SINGLE-FILE JAVASCRIPT (Enhanced)
        // =============================================
        
        let currentUser = null;
        let users = [];
        let events = [];
        let announcements = [];
        let mediaItems = [];
        let activityLog = [];
        let verityChatHistory = [];
        let isMusicPlaying = false;
        let musicInterval = null;
        let musicVolume = 0.6;
        let currentMusicTrack = 'welcome';
        let audioContext = null;
        let musicGain = null;

        // Robust safeStorage wrapper for sandboxed environments
        let storageAvailable = true;
        
        const safeStorage = {
            getItem(key) {
                try {
                    return localStorage.getItem(key);
                } catch (e) {
                    if (storageAvailable) {
                        storageAvailable = false;
                        console.warn('%c[Multi Media] Running in sandboxed environment. Using memory fallback (data will not persist after refresh).', 'color:#FFD700');
                    }
                    return null;
                }
            },
            setItem(key, value) {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    if (storageAvailable) {
                        storageAvailable = false;
                        console.warn('%c[Multi Media] Running in sandboxed environment. Data changes will not persist.', 'color:#FFD700');
                    }
                }
            }
        };

        const SAMPLE_USERS = [
            { id: 1, username: 'alex_rivera', email: 'alex.rivera@school.edu', passwordHash: btoa('admin2026'), role: 'Admin', joined: '2024-09-01', active: true, online: true, officerRole: 'President' },
            { id: 2, username: 'maya_chen', email: 'maya.chen@school.edu', passwordHash: btoa('editor2026'), role: 'Editor', joined: '2025-01-12', active: true, online: true, officerRole: 'Vice President' },
            { id: 3, username: 'jake_morales', email: 'jake.morales@school.edu', passwordHash: btoa('photo2026'), role: 'Photographer', joined: '2025-02-03', active: true, online: false, officerRole: 'P.I.O.' },
            { id: 4, username: 'kai_nakamura', email: 'kai.nakamura@school.edu', passwordHash: btoa('member2026'), role: 'Member', joined: '2025-02-20', active: true, online: true, officerRole: null }
        ];

        const SAMPLE_EVENTS = [
            { id: 1, name: "Winter Showcase 2026", date: "2026-02-14T18:30:00", description: "Annual showcase of student films and photography.", location: "Main Auditorium", posterColor: "#FFD700" },
            { id: 2, name: "Spring Film Festival", date: "2026-04-18T17:00:00", description: "Screenings of award-winning short films.", location: "School Theater", posterColor: "#FFC107" }
        ];

        const SAMPLE_ANNOUNCEMENTS = [
            { id: 1, title: "New Camera Equipment Arrived!", content: "We received new Sony FX3 cameras and lighting kit.", category: "General", date: "2026-01-20", pinned: true, author: "admin_alex" },
            { id: 2, title: "Call for Submissions: Spring Film Festival", content: "Submit your short films by March 25.", category: "Event", date: "2026-01-28", pinned: true, author: "editor_maya" }
        ];

        // Allowed passwords for member access (strict list)
        const ALLOWED_PASSWORDS = [
            "Q7#mL2!x", "V$9pT4@k", "n8&Xr1*F", "Z!5qHm#2",
            "c@7YwL9%", "R3^fNp8!", "u#6Jx2$M", "P!4vK9&d", "h8*Qz1@T"
        ];

        // Secure password hashing using Web Crypto API (SHA-256)
        async function hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }

        // Verify password during login
        async function verifyPassword(inputPassword, storedHash) {
            const inputHash = await hashPassword(inputPassword);
            return inputHash === storedHash;
        }

        function initTailwind() {
            if (typeof tailwind !== 'undefined') {
                tailwind.config = { theme: { extend: { colors: { gold: '#FFD700' } } } };
            }
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast max-w-sm w-full glass px-5 py-3.5 rounded-2xl flex items-start gap-x-3 text-sm border-l-4 ${type === 'success' ? 'border-emerald-400' : type === 'error' ? 'border-red-400' : 'border-[#FFD700]'}`;
            toast.innerHTML = `<div class="flex-1">${message}</div><button onclick="this.parentElement.remove()" class="text-xl leading-none">&times;</button>`;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 4200);
        }

        function initAudio() {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                musicGain = audioContext.createGain();
                musicGain.gain.value = musicVolume;
                musicGain.connect(audioContext.destination);
            } catch(e) {}
        }

        function playSFX(type) {
            if (!audioContext) return;
            const ctx = audioContext;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            if (type === 'click') { osc.frequency.value = 880; gain.gain.value = 0.2; osc.type = 'sawtooth'; }
            else if (type === 'success') { osc.frequency.value = 660; gain.gain.value = 0.3; }
            else if (type === 'notification') { osc.frequency.value = 880; gain.gain.value = 0.25; }
            
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.4);
        }

        function startBGM(track = 'welcome') {
            if (!audioContext || isMusicPlaying) return;
            stopBGM();
            isMusicPlaying = true;
            currentMusicTrack = track;
            
            const notes = track === 'creative' ? [60,64,67,71] : [64,67,71,74];
            let i = 0;
            
            function playNote() {
                if (!isMusicPlaying) return;
                const freq = 440 * Math.pow(2, (notes[i] - 69) / 12);
                const osc = audioContext.createOscillator();
                const g = audioContext.createGain();
                osc.frequency.value = freq;
                osc.type = 'sine';
                osc.connect(g);
                g.connect(musicGain);
                g.gain.value = 0.12;
                g.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.7);
                osc.start();
                osc.stop(audioContext.currentTime + 0.9);
                i = (i + 1) % notes.length;
            }
            
            playNote();
            musicInterval = setInterval(playNote, 480);
            
            const btn = document.getElementById('music-play-btn');
            if (btn) btn.innerHTML = `<i class="fa-solid fa-pause"></i> Pause`;
        }

        function stopBGM() {
            isMusicPlaying = false;
            if (musicInterval) clearInterval(musicInterval);
            const btn = document.getElementById('music-play-btn');
            if (btn) btn.innerHTML = `<i class="fa-solid fa-play"></i> Play`;
        }

        function toggleMusic() {
            if (isMusicPlaying) stopBGM();
            else startBGM(currentMusicTrack);
        }

        function changeMusicTrack() {
            const select = document.getElementById('music-track');
            currentMusicTrack = select.value;
            if (isMusicPlaying) {
                stopBGM();
                setTimeout(() => startBGM(currentMusicTrack), 100);
            }
        }

        function setMusicVolume(val) {
            musicVolume = parseFloat(val);
            if (musicGain) musicGain.gain.value = musicVolume;
        }

        // Konami Codes
        let konami = [];
        const KONAMI_ADMIN = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowRight','ArrowRight','ArrowLeft'];
        const KONAMI_LOGIN = ['ArrowDown','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];   // New secret sequence for login/register
        
        function initKonami() {
            document.addEventListener('keydown', e => {
                // Prevent scrolling when entering Konami sequences
                if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && konami.length > 0) {
                    e.preventDefault();
                }

                konami.push(e.key);
                if (konami.length > 12) konami.shift();
                
                // Admin Konami: ↑↑↓↓→→← (Limited to 2 Admins)
                if (konami.join(',') === KONAMI_ADMIN.join(',')) {
                    konami = [];
                    const currentAdmins = users.filter(u => u.role === 'Admin').length;
                    
                    if (currentAdmins >= 2) {
                        showToast("Admin slots are full (max 2). Use special code to override.", "error");
                        return;
                    }
                    
                    const code = prompt("Enter the 4-digit secret code:");
                    if (code === "2254") {
                        showToast("Secret code accepted! Unlocking advanced features...");
                        
                        if (currentUser) {
                            currentUser.role = "Admin";
                            const idx = users.findIndex(u => u.id === currentUser.id);
                            if (idx !== -1) users[idx].role = "Admin";
                            safeStorage.setItem("mm_users", JSON.stringify(users));
                            safeStorage.setItem("mm_currentUser", JSON.stringify(currentUser));
                            updateNavUser();
                            showToast("Your account is now permanent Admin!", "success");
                        } else {
                            showToast("Please log in first before using the admin code.", "info");
                        }
                        
                        setTimeout(() => showAdminPanel(), 600);
                    } else {
                        showToast("Incorrect secret code.", "error");
                    }
                }
                
                // New secret sequence: Down, Up, Down, Left, Right → Ask for password to access Login/Register
                if (konami.join(',') === KONAMI_LOGIN.join(',')) {
                    konami = [];
                    const pass = prompt("Enter access password:");
                    if (pass === CLUB_JOIN_CODE || pass === "demo2026") {
                        showToast("Access granted");
                        showLoginModal();
                    } else {
                        showToast("Incorrect password", "error");
                    }
                }
                
                // Special Admin Override Code: ↓ ↓ ↓ (Bypasses the 2 Admin limit)
                if (konami.join(',') === ['ArrowDown','ArrowDown','ArrowDown'].join(',')) {
                    konami = [];
                    const code = prompt("Enter the 4-digit secret code:");
                    if (code === "2254") {
                        if (currentUser) {
                            currentUser.role = "Admin";
                            const idx = users.findIndex(u => u.id === currentUser.id);
                            if (idx !== -1) users[idx].role = "Admin";
                            safeStorage.setItem("mm_users", JSON.stringify(users));
                            safeStorage.setItem("mm_currentUser", JSON.stringify(currentUser));
                            updateNavUser();
                            showToast("Special access granted! You are now Admin (override used).", "success");
                        }
                        setTimeout(() => showAdminPanel(), 600);
                    } else {
                        showToast("Incorrect secret code.", "error");
                    }
                }
            });
        }

        // Admin Panel
        let adminRefreshInterval = null;

        function showAdminPanel() {
            if (!currentUser || currentUser.role !== "Admin") {
                showToast("Admin access required.", "error");
                return;
            }
            document.getElementById("admin-panel").classList.remove("hidden");
            document.getElementById("admin-panel").classList.add("flex");
            
            renderAdminStats();
            renderLoginHistory();
            renderAdminUsers();
            renderLiveOnlineUsers();

            // Auto-refresh stats every 8 seconds while admin panel is open
            if (adminRefreshInterval) clearInterval(adminRefreshInterval);
            adminRefreshInterval = setInterval(() => {
                if (!document.getElementById("admin-panel").classList.contains("hidden")) {
                    renderAdminStats();
                    renderLiveOnlineUsers();
                } else {
                    clearInterval(adminRefreshInterval);
                }
            }, 8000);
        }

        function hideAdminPanel() {
            document.getElementById("admin-panel").classList.remove("flex");
            document.getElementById("admin-panel").classList.add("hidden");
            if (adminRefreshInterval) {
                clearInterval(adminRefreshInterval);
                adminRefreshInterval = null;
            }
        }

        function renderAdminStats() {
            const container = document.getElementById("admin-stats");
            const total = users.length;
            const online = users.filter(u => u.online).length;
            const admins = users.filter(u => u.role === "Admin").length;
            const editors = users.filter(u => u.role === "Editor").length;
            const photographers = users.filter(u => u.role === "Photographer").length;
            
            container.innerHTML = `
                <div class="glass p-5 rounded-2xl">
                    <div class="text-xs text-white/50 mb-1">TOTAL MEMBERS</div>
                    <div class="text-4xl font-bold">${total}</div>
                </div>
                <div class="glass p-5 rounded-2xl border border-emerald-500/30">
                    <div class="text-xs text-emerald-400 mb-1">CURRENTLY ONLINE</div>
                    <div class="text-4xl font-bold text-emerald-400">${online}</div>
                </div>
                <div class="glass p-5 rounded-2xl">
                    <div class="text-xs text-white/50 mb-1">ADMINS</div>
                    <div class="text-4xl font-bold">${admins}</div>
                </div>
                <div class="glass p-5 rounded-2xl">
                    <div class="text-xs text-white/50 mb-1">EDITORS</div>
                    <div class="text-4xl font-bold">${editors}</div>
                </div>
                <div class="glass p-5 rounded-2xl">
                    <div class="text-xs text-white/50 mb-1">PHOTOGRAPHERS</div>
                    <div class="text-4xl font-bold">${photographers}</div>
                </div>
                <div class="glass p-5 rounded-2xl">
                    <div class="text-xs text-white/50 mb-1">UPCOMING EVENTS</div>
                    <div class="text-4xl font-bold">${events.length}</div>
                </div>
            `;
        }

        function renderLoginHistory() {
            const container = document.getElementById("login-history");
            if (loginHistory.length === 0) {
                container.innerHTML = `<div class="text-white/50 text-sm p-2">No recent logins yet.</div>`;
                return;
            }
            container.innerHTML = loginHistory.slice(0, 8).map(log => `
                <div class="flex justify-between py-1.5 border-b border-white/10 last:border-none">
                    <div><span class="font-medium">${log.username}</span> <span class="text-xs text-white/40">(${log.role})</span></div>
                    <div class="text-xs text-white/50">${new Date(log.time).toLocaleTimeString()}</div>
                </div>
            `).join("");
        }

        let currentUserFilter = '';

        function filterAdminUsers() {
            currentUserFilter = document.getElementById('user-search').value.toLowerCase();
            renderAdminUsers();
        }

        function renderAdminUsers(filteredUsers = null) {
            const tbody = document.getElementById("admin-users-table");
            tbody.innerHTML = "";
            
            let list = filteredUsers || users;
            
            if (currentUserFilter) {
                list = list.filter(u => 
                    u.username.toLowerCase().includes(currentUserFilter) || 
                    u.email.toLowerCase().includes(currentUserFilter)
                );
            }
            
            list.forEach(user => {
                const officer = user.officerRole || '—';
                const tr = document.createElement("tr");
                tr.className = "hover:bg-white/5 transition-colors";
                tr.innerHTML = `
                    <td class="py-4 px-6">
                        <div class="flex items-center gap-x-3">
                            <img src="https://i.pravatar.cc/32?u=${user.id}" class="w-8 h-8 rounded-xl">
                            <span class="font-medium">${user.username}</span>
                        </div>
                    </td>
                    <td class="py-4 text-sm text-white/70">${user.email}</td>
                    <td class="py-4">
                        <span class="px-3 py-1 text-xs rounded-full bg-white/10">${user.role}</span>
                    </td>
                    <td class="py-4 text-sm text-[#FFD700]">${officer}</td>
                    <td class="py-4">
                        <span class="px-3 py-1 text-xs rounded-full ${user.online ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/60'}">
                            ${user.online ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td class="py-4 text-right pr-6 space-x-2">
                        <button onclick="makeAdmin(${user.id})" class="text-xs px-4 py-1.5 border border-white/20 rounded-xl hover:bg-white/5">Promote</button>
                        <button onclick="toggleUserStatus(${user.id})" class="text-xs px-4 py-1.5 border border-white/20 rounded-xl hover:bg-white/5">
                            ${user.active !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="showAssignOfficerModal(${user.id})" class="text-xs px-4 py-1.5 bg-[#FFD700] text-[#0A0A1F] rounded-xl font-medium">Position</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function renderLiveOnlineUsers() {
            const container = document.getElementById('live-users-list');
            if (!container) return;
            
            const onlineUsers = users.filter(u => u.online);
            document.getElementById('online-count').innerHTML = `${onlineUsers.length} online`;
            
            if (onlineUsers.length === 0) {
                container.innerHTML = `<div class="text-center py-8 text-white/50 text-sm">No members currently online</div>`;
                return;
            }
            
            container.innerHTML = onlineUsers.map(user => `
                <div class="flex items-center justify-between py-3 border-b border-white/10 last:border-none">
                    <div class="flex items-center gap-x-3">
                        <img src="https://i.pravatar.cc/28?u=${user.id}" class="w-7 h-7 rounded-lg">
                        <div>
                            <div class="font-medium text-sm">${user.username}</div>
                            <div class="text-xs text-white/50">${user.role}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-emerald-400">Active now</div>
                    </div>
                </div>
            `).join('');
        }

        // Officer Role Assignment
        function showAssignOfficerModal(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;

            const roles = ['President', 'Vice President', 'Secretary', 'Treasurer', 'P.I.O.', 'None'];
            const current = user.officerRole || 'None';
            
            const choice = prompt(`Assign officer role for ${user.username}\nCurrent: ${current}\n\nOptions: ${roles.join(', ')}`);
            
            if (!choice) return;
            
            if (choice.toLowerCase() === 'none') {
                user.officerRole = null;
            } else if (roles.includes(choice)) {
                user.officerRole = choice;
            } else {
                showToast("Invalid role", "error");
                return;
            }
            
            safeStorage.setItem("mm_users", JSON.stringify(users));
            renderAdminUsers();
            showToast(`Officer role updated for ${user.username}`);
        }

        function makeAdmin(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            user.role = "Admin";
            if (currentUser && currentUser.id === userId) currentUser.role = "Admin";
            safeStorage.setItem("mm_users", JSON.stringify(users));
            if (currentUser) safeStorage.setItem("mm_currentUser", JSON.stringify(currentUser));
            renderAdminUsers();
            showToast(`${user.username} is now Admin`, "success");
        }

        function toggleUserStatus(userId) {
            const user = users.find(u => u.id === userId);
            if (!user) return;
            
            user.active = !user.active;
            safeStorage.setItem("mm_users", JSON.stringify(users));
            renderAdminUsers();
            
            if (user.active) {
                showToast(`${user.username} access has been restored.`);
            } else {
                showToast(`${user.username} has been banned from the website.`, "error");
            }
        }

        // Export Login History as CSV
        function exportLoginHistoryCSV() {
            if (!loginHistory || loginHistory.length === 0) {
                showToast("No login history available to export.", "info");
                return;
            }

            let csv = "Username,Role,Login Time\n";
            
            loginHistory.forEach(log => {
                csv += `"${log.username}","${log.role}","${new Date(log.time).toLocaleString()}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `login-history-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast("Login history exported successfully!");
        }

        // Analytics Modal
        function showAnalyticsModal() {
            // Dynamically load Chart.js only when needed (performance optimization)
            if (typeof Chart === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                script.onload = () => {
                    openAnalyticsModal();
                };
                document.head.appendChild(script);
            } else {
                openAnalyticsModal();
            }
        }

        function openAnalyticsModal() {
            const modal = document.createElement('div');
            modal.className = `fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4`;
            modal.innerHTML = `
                <div class="glass w-full max-w-5xl rounded-3xl p-8 max-h-[90vh] overflow-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold">Dashboard Analytics</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-2xl">×</button>
                    </div>
                    
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div class="glass p-5 rounded-2xl">
                            <h4 class="font-semibold mb-4">Daily Logins (Last 7 Days)</h4>
                            <canvas id="dailyLoginsChart" height="120"></canvas>
                        </div>
                        <div class="glass p-5 rounded-2xl">
                            <h4 class="font-semibold mb-4">Device Usage</h4>
                            <canvas id="deviceChart" height="120"></canvas>
                        </div>
                        <div class="glass p-5 rounded-2xl">
                            <h4 class="font-semibold mb-4">Browser Distribution</h4>
                            <canvas id="browserChart" height="120"></canvas>
                        </div>
                        <div class="glass p-5 rounded-2xl">
                            <h4 class="font-semibold mb-4">User Growth</h4>
                            <canvas id="growthChart" height="120"></canvas>
                        </div>
                    </div>
                    
                    <div class="mt-6 text-center text-xs text-white/50">
                        Data is simulated for demo purposes.
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                renderAnalyticsCharts();
            }, 150);
        }

        function renderAnalyticsCharts() {
            // Daily Logins Line Chart
            new Chart(document.getElementById('dailyLoginsChart'), {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Logins',
                        data: [12, 19, 14, 22, 18, 9, 15],
                        borderColor: '#FFD700',
                        tension: 0.4,
                        fill: false
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });

            // Device Usage Doughnut
            new Chart(document.getElementById('deviceChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Desktop', 'Laptop', 'Mobile', 'Tablet'],
                    datasets: [{
                        data: [35, 40, 20, 5],
                        backgroundColor: ['#FFD700', '#FFC107', '#FFEA00', '#B8860B']
                    }]
                }
            });

            // Browser Usage Bar
            new Chart(document.getElementById('browserChart'), {
                type: 'bar',
                data: {
                    labels: ['Chrome', 'Firefox', 'Edge', 'Safari'],
                    datasets: [{
                        label: 'Users',
                        data: [55, 18, 15, 12],
                        backgroundColor: '#FFD700'
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });

            // User Growth Line
            new Chart(document.getElementById('growthChart'), {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Total Users',
                        data: [45, 62, 78, 95, 110, 128],
                        borderColor: '#FFEA00',
                        tension: 0.3
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false } } }
            });
        }

        // Auth with safe storage
        function loadData() {
            users = JSON.parse(safeStorage.getItem('mm_users') || '[]').filter(u => !['alex.rivera@school.edu', 'maya.chen@school.edu', 'jake.morales@school.edu', 'kai.nakamura@school.edu'].includes(u.email));
            events = JSON.parse(safeStorage.getItem('mm_events') || '[]').filter(ev => !['Winter Showcase 2026', 'Spring Film Festival'].includes(ev.name));
            announcements = JSON.parse(safeStorage.getItem('mm_announcements') || '[]').filter(a => !['New Camera Equipment Arrived!', 'Call for Submissions: Spring Film Festival'].includes(a.title));
            mediaItems = JSON.parse(safeStorage.getItem('mm_media') || '[]').filter(item => item.caption !== 'Winter showcase');
            
            const savedUser = safeStorage.getItem('mm_currentUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                updateNavUser();
            }

            if (!storageAvailable) {
                setTimeout(() => {
                    showToast("Running in limited/sandboxed mode. Data won't persist after refresh.", "info");
                }, 1500);
            }
        }

        function saveData() {
            safeStorage.setItem('mm_users', JSON.stringify(users));
            safeStorage.setItem('mm_events', JSON.stringify(events));
            safeStorage.setItem('mm_announcements', JSON.stringify(announcements));
            safeStorage.setItem('mm_media', JSON.stringify(mediaItems));
        }

        function updateNavUser() {
            const el = document.getElementById('nav-user-section');
            if (!currentUser) {
                el.innerHTML = '';
                return;
            }
            
            const roleColor = currentUser.role === 'Admin' ? 'text-[#FFD700]' : 'text-white/70';
            
            el.innerHTML = `
                <div class="flex items-center gap-x-2 cursor-pointer" onclick="showDashboard()">
                    <img src="${currentUser.avatar || 'pfp.jpg'}" class="w-8 h-8 rounded-2xl border border-white/30" onerror="this.src='https://i.pravatar.cc/32?u=${currentUser.id}'">
                    <div class="hidden md:flex items-center gap-x-1.5">
                        <span class="text-sm font-medium">${currentUser.username}</span>
                        <span class="text-[10px] px-2 py-px rounded-full border border-white/20 ${roleColor}">${currentUser.role}</span>
                    </div>
                </div>
            `;
        }

        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-password').value;
            
            // Find user and verify password (supports both new SHA-256 and legacy btoa for demo accounts)
            let user = null;
            const legacyHash = btoa(pass);
            
            for (const u of users) {
                const isLegacyMatch = u.passwordHash === legacyHash;
                const isSecureMatch = await verifyPassword(pass, u.passwordHash);
                
                if ((u.email === email || u.username === email) && (isLegacyMatch || isSecureMatch)) {
                    user = u;
                    break;
                }
            }
            
            if (user) {
                const accessCode = (document.getElementById('login-access-code') || {}).value || '';
                if (user.role === 'Admin' && accessCode !== ADMIN_ACCESS_CODE) {
                    showToast('Admin access code required', 'error');
                    return;
                }
                if (user.role === 'Developer' && accessCode !== DEVELOPER_ACCESS_CODE) {
                    showToast('Developer access code required', 'error');
                    return;
                }
                currentUser = user;
                safeStorage.setItem('mm_currentUser', JSON.stringify(currentUser));
                
                // Record login
                const history = JSON.parse(safeStorage.getItem('mm_login_history') || '[]');
                history.unshift({ username: user.username, role: user.role, time: new Date().toISOString() });
                safeStorage.setItem('mm_login_history', JSON.stringify(history.slice(0, 20)));
                
                hideLoginModal();
                updateNavUser();
                showToast(`Welcome back, ${user.username}!`, 'success');
                setTimeout(showDashboard, 600);
            } else {
                showToast('Invalid credentials', 'error');
            }
        }

        async function handleRegister(e) {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-password').value;
            const role = document.getElementById('reg-role').value;
            const passcode = document.getElementById('reg-passcode').value;
            
            if (passcode !== CLUB_JOIN_CODE) {
                showToast('Invalid club registration code. Please contact a club officer for the correct code.', 'error');
                return;
            }
            const accessCode = (document.getElementById('reg-access-code') || {}).value || '';
            if (role === 'Admin' && accessCode !== ADMIN_ACCESS_CODE) {
                showToast('Admin code required', 'error');
                return;
            }
            if (role === 'Developer' && accessCode !== DEVELOPER_ACCESS_CODE) {
                showToast('Developer code required', 'error');
                return;
            }
            
            // Professional registration rules
            // 1. Password must not already be used by another account
            const passwordHash = await hashPassword(pass);
            const passwordAlreadyUsed = users.some(u => u.passwordHash === passwordHash);
            if (passwordAlreadyUsed) {
                showToast('This password is already in use. Please choose another.', 'error');
                return;
            }
            
            // 2. Prevent registering as Admin if slots are full (max 2)
            if (role === 'Admin') {
                const currentAdmins = users.filter(u => u.role === 'Admin').length;
                if (currentAdmins >= 2) {
                    showToast('Admin role is currently full. Please contact an existing administrator.', 'error');
                    return;
                }
            }
            
            const newUser = {
                id: Date.now(),
                username,
                email,
                passwordHash: passwordHash,
                role,
                joined: new Date().toISOString().split('T')[0],
                active: true,
                online: true,
                officerRole: null
            };
            
            users.push(newUser);
            saveData();
            currentUser = newUser;
            safeStorage.setItem('mm_currentUser', JSON.stringify(currentUser));
            hideRegisterModal();
            updateNavUser();
            showToast('Account created! Welcome to the crew.', 'success');
            setTimeout(showDashboard, 800);
        }

        function logout() {
            currentUser = null;
            safeStorage.setItem('mm_currentUser', '');
            updateNavUser();
            hideDashboard();
            showToast('Logged out successfully');
        }

        // Events
        function renderEvents() {
            const grid = document.getElementById('events-grid');
            grid.innerHTML = '';
            
            events.forEach(ev => {
                const remaining = getTimeRemaining(ev.date);
                const card = document.createElement('div');
                card.className = `card glass rounded-3xl overflow-hidden border border-white/10`;
                card.innerHTML = `
                    <div class="h-36 flex items-center justify-center" style="background: linear-gradient(135deg, ${ev.posterColor || '#FFD700'}22, #111133)">
                        <i class="fa-solid fa-film text-5xl opacity-40" style="color:${ev.posterColor || '#FFD700'}"></i>
                    </div>
                    <div class="p-5">
                        <div class="font-semibold text-xl mb-1">${ev.name}</div>
                        <div class="text-xs text-white/50 mb-3">${new Date(ev.date).toLocaleDateString()}</div>
                        <p class="text-sm text-[#B8B8D0] line-clamp-2 mb-4">${ev.description}</p>
                        <div class="flex justify-between items-center">
                            <div class="countdown text-sm font-mono">
                                ${remaining.expired ? 'ENDED' : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`}
                            </div>
                            <button onclick="rsvpEvent(${ev.id}, this)" class="text-xs px-4 py-1.5 rounded-2xl border border-[#FFD700]/60">RSVP</button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
            
            startCountdowns();
        }

        function getTimeRemaining(dateStr) {
            const diff = new Date(dateStr) - Date.now();
            if (diff <= 0) return {expired: true};
            return {
                expired: false,
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000)
            };
        }

        let countdownTimer;
        function startCountdowns() {
            if (countdownTimer) clearInterval(countdownTimer);
            countdownTimer = setInterval(() => {
                document.querySelectorAll('#events-grid .countdown').forEach((el, i) => {
                    if (events[i]) {
                        const r = getTimeRemaining(events[i].date);
                        el.innerHTML = r.expired ? 'ENDED' : `${r.days}d ${r.hours}h ${r.minutes}m`;
                    }
                });
            }, 30000);
        }

        function rsvpEvent(id, btn) {
            if (!currentUser) { showLoginModal(); return; }
            btn.innerHTML = '✓ RSVP\'d';
            btn.disabled = true;
            showToast('RSVP successful!', 'success');
        }

        function showCreateEventModal() {
            if (!currentUser || (currentUser.role !== 'Editor' && currentUser.role !== 'Admin')) {
                alert('Editor/Admin only');
                return;
            }
            const name = prompt('Event Name:');
            if (!name) return;
            const date = prompt('Date & Time (YYYY-MM-DDTHH:MM):', '2026-05-10T18:00');
            if (!date) return;
            
            events.push({
                id: Date.now(),
                name,
                date,
                description: 'New event added via admin.',
                location: 'Campus',
                posterColor: '#FFD700'
            });
            saveData();
            renderEvents();
            showToast('Event created!');
        }

        // Announcements
        let currentFilter = 'all';
        
        function renderAnnouncements(filtered = null) {
            const container = document.getElementById('announcements-list');
            container.innerHTML = '';
            let list = filtered || announcements;
            
            list.sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.date) - new Date(a.date));
            
            list.forEach(ann => {
                const div = document.createElement('div');
                div.className = `glass p-6 rounded-3xl ${ann.pinned ? 'ring-1 ring-[#FFD700]/30' : ''}`;
                div.innerHTML = `
                    <div class="flex justify-between">
                        <div>
                            <span class="px-3 py-px text-xs rounded-full bg-white/10">${ann.category}</span>
                            ${ann.pinned ? '<span class="ml-2 text-[#FFD700] text-xs">📌 PINNED</span>' : ''}
                            <h4 class="font-semibold text-xl mt-2">${ann.title}</h4>
                            <p class="text-[#B8B8D0] mt-1">${ann.content}</p>
                        </div>
                        ${currentUser && (currentUser.role === 'Editor' || currentUser.role === 'Admin') ? `
                        <div class="flex flex-col gap-2">
                            <button onclick="togglePin(${ann.id})" class="text-xs px-3 py-1 border border-white/20 rounded-xl">Pin</button>
                            <button onclick="deleteAnn(${ann.id})" class="text-xs px-3 py-1 border border-red-400/40 text-red-400 rounded-xl">Delete</button>
                        </div>` : ''}
                    </div>
                `;
                container.appendChild(div);
            });
        }

        function filterAnnouncements() {
            const term = document.getElementById('announcement-search').value.toLowerCase();
            let filtered = announcements.filter(a => a.title.toLowerCase().includes(term) || a.content.toLowerCase().includes(term));
            renderAnnouncements(filtered);
        }

        function togglePin(id) {
            const ann = announcements.find(a => a.id === id);
            ann.pinned = !ann.pinned;
            saveData();
            renderAnnouncements();
        }

        function deleteAnn(id) {
            if (!confirm('Delete this announcement?')) return;
            announcements = announcements.filter(a => a.id !== id);
            saveData();
            renderAnnouncements();
        }

        function showCreateAnnouncementModal() {
            if (!currentUser || (currentUser.role !== 'Editor' && currentUser.role !== 'Admin')) {
                alert('Editor/Admin only');
                return;
            }
            const title = prompt('Announcement Title:');
            if (!title) return;
            const content = prompt('Content:');
            if (!content) return;
            
            announcements.unshift({
                id: Date.now(),
                title,
                content,
                category: 'General',
                date: new Date().toISOString().split('T')[0],
                pinned: false,
                author: currentUser.username
            });
            saveData();
            renderAnnouncements();
            showToast('Announcement published!');
        }

        // Verity Chat + voice
        const VERITY_IDLE_SRC = "images/idle.jpg";
        const VERITY_TALKING_SRC = "images/talking.jpg";
        const VERITY_SAD_SRC = "images/sad.jpg";
        const VERITY_ANGRY_SRC = "images/angry.jpg";
        const CLUB_JOIN_CODE = "MMC-JOIN-4821";
        const ADMIN_ACCESS_CODE = "MMC-ADMIN-7394";
        const DEVELOPER_ACCESS_CODE = "MMC-DEV-1560";
        let verityVoiceEnabled = true;
        let verityAudio = null;
        let verityObjectUrl = null;
        let verityIsTalking = false;
        let verityMood = "idle";
        let veritySpeechToken = 0;
        let veritySwearStrikes = 0;
        let verityGreetingAdded = false;

        function loadVerityVoicePreference() {
            try {
                if (safeStorage.getItem("verityVoiceEnabled") === "false") verityVoiceEnabled = false;
            } catch (e) {}
            const btn = document.getElementById("verity-voice-btn");
            if (btn) btn.textContent = verityVoiceEnabled ? "🔊 Voice ON" : "🔇 Voice OFF";
        }
        function toggleVerityVoice() {
            verityVoiceEnabled = !verityVoiceEnabled;
            safeStorage.setItem("verityVoiceEnabled", verityVoiceEnabled ? "true" : "false");
            const btn = document.getElementById("verity-voice-btn");
            if (btn) btn.textContent = verityVoiceEnabled ? "🔊 Voice ON" : "🔇 Voice OFF";
            if (!verityVoiceEnabled) stopVeritySpeaking();
        }
        function verityImageForState() {
            if (verityMood === "sad") return VERITY_SAD_SRC;
            if (verityMood === "angry") return VERITY_ANGRY_SRC;
            return verityIsTalking ? VERITY_TALKING_SRC : VERITY_IDLE_SRC;
        }
        function setVerityMood(mood) { verityMood = mood || "idle"; setVerityTalking(verityIsTalking); }
        function setVerityTalking(isTalking) {
            verityIsTalking = !!isTalking;
            const src = verityImageForState();
            document.querySelectorAll(".verity-avatar-img, .verity-orb img").forEach(function (img) {
                if (img.getAttribute("src") === src) return;
                img.setAttribute("src", src);
            });
        }
        function showVerityOrbBubble(text) {
            const bubble = document.getElementById("verity-orb-bubble");
            if (!bubble) return;
            bubble.textContent = text;
            bubble.classList.add("is-visible");
        }
        function hideVerityOrbBubble() {
            const bubble = document.getElementById("verity-orb-bubble");
            if (!bubble) return;
            bubble.classList.remove("is-visible");
            bubble.textContent = "";
        }
        function stopVeritySpeaking() {
            if (verityAudio) { try { verityAudio.pause(); } catch (e) {} verityAudio = null; }
            if (verityObjectUrl) { URL.revokeObjectURL(verityObjectUrl); verityObjectUrl = null; }
            setVerityTalking(false);
        }
        function finishVeritySpeech(audio, url) {
            if (verityAudio !== audio) return;
            verityMood = "idle";
            setVerityTalking(false);
            hideVerityOrbBubble();
            verityAudio = null;
            if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 800);
        }
        async function speakVerity(text) {
            if (!verityVoiceEnabled || !text) return;
            const token = ++veritySpeechToken;
            showVerityOrbBubble(text);
            try {
                const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text })
                });
                if (token !== veritySpeechToken) return;
                if (!response.ok) throw new Error("TTS failed");
                const bytes = await response.arrayBuffer();
                if (token !== veritySpeechToken || !bytes || bytes.byteLength < 128) throw new Error("empty audio");
                if (verityAudio) { try { verityAudio.pause(); } catch (e) {} }
                if (verityObjectUrl) URL.revokeObjectURL(verityObjectUrl);
                const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
                verityObjectUrl = url;
                const audio = new Audio(url);
                verityAudio = audio;
                audio.onplay = function () { if (token === veritySpeechToken) setVerityTalking(true); };
                audio.onended = function () { finishVeritySpeech(audio, url); };
                audio.onerror = function () { finishVeritySpeech(audio, url); };
                await audio.play();
            } catch (error) {
                if (token !== veritySpeechToken) return;
                console.warn("Verity voice unavailable:", error);
                setVerityTalking(false);
            }
        }

        function showVerityChat() {
            const modal = document.getElementById("verity-chat-modal");
            modal.classList.remove("hidden");
            modal.classList.add("flex");
            renderChat();
        }

        function hideVerityChat() {
            const modal = document.getElementById("verity-chat-modal");
            modal.classList.remove("flex");
            modal.classList.add("hidden");
        }

        function addVerityMessage(text, options) {
            const opts = options || {};
            verityChatHistory.push({ role: "verity", content: text });
            renderChat();
            const orb = document.getElementById("floating-verity");
            if (orb) {
                orb.style.transition = "transform 0.2s ease";
                orb.style.transform = "scale(1.06)";
                setTimeout(function () { if (orb) orb.style.transform = ""; }, 400);
            }
            if (opts.speak !== false && verityVoiceEnabled) speakVerity(text);
            else showVerityOrbBubble(text);
        }

        function renderChat() {
            const container = document.getElementById("chat-messages");
            if (!container) return;
            const buttons = container.querySelector(".verity-quick-replies");
            container.innerHTML = "";
            verityChatHistory.forEach(function (msg) {
                const div = document.createElement("div");
                if (msg.role === "user") {
                    div.innerHTML = '<div class="chat-bubble-user">' + escapeHtml(msg.content) + "</div>";
                } else {
                    div.innerHTML = '<div class="flex gap-x-3 items-end"><div class="verity-orb" style="width:28px;height:28px;min-width:28px;min-height:28px;animation:none;"><img src="' + verityImageForState() + '" class="verity-avatar-img" alt="Verity"></div><div class="chat-bubble-verity">' + escapeHtml(msg.content) + "</div></div>";
                }
                container.appendChild(div);
            });
            if (buttons) container.appendChild(buttons);
            container.scrollTop = container.scrollHeight;
        }
        function escapeHtml(text) {
            return String(text).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
        }

        function isInappropriateMessage(q) {
            return ["fuck", "shit", "bitch", "asshole", "damn"].some(function (word) { return q.includes(word); });
        }

        function sendChatMessage() {
            const input = document.getElementById("chat-input");
            if (!input.value.trim()) return;
            const message = input.value.trim();
            const lowerMsg = message.toLowerCase();
            input.value = "";
            if (isInappropriateMessage(lowerMsg)) {
                veritySwearStrikes += 1;
                verityChatHistory.push({ role: "user", content: "..." });
                if (veritySwearStrikes >= 2) { setVerityMood("angry"); addVerityMessage("Stop.."); }
                else { setVerityMood("sad"); addVerityMessage("Please don't say that."); }
                return;
            }
            veritySwearStrikes = 0;
            verityChatHistory.push({ role: "user", content: message });
            renderChat();
            const response = getVerityResponse(message);
            addVerityMessage(response);
        }

        function getVerityResponse(q) {
            q = (q || "").toLowerCase().trim();
            if (/^(hi|hello|hey|yo)( verity)?[!?. ]*$/.test(q) || q.indexOf("hello verity") !== -1 || q.indexOf("hi verity") !== -1) {
                return Math.random() < 0.5 ? "Whatssup?" : "Yes?";
            }
            if (q.includes("role") || q.includes("what am i") || q.includes("my account")) {
                if (!currentUser) return "You are not signed in, so I cannot see a role yet.";
                if (currentUser.role === "Admin") return currentUser.username + " is signed in as Admin. This account can use every club tool.";
                if (currentUser.role === "Developer") return currentUser.username + " is signed in as Developer. This account can publish content and review site accounts.";
                if (currentUser.role === "Editor") return currentUser.username + " is signed in as Editor. This account can add events and announcements.";
                if (currentUser.role === "Photographer") return currentUser.username + " is signed in as Photographer. This account can add photo uploads.";
                return currentUser.username + " is signed in as Member. This account can view events, announcements, and the personal dashboard.";
            }
            if (q.includes("tour") || q.includes("show me around")) {
                setTimeout(startWebsiteTour, 600);
                return "Sure. I will show you around.";
            }
            if (q.includes("event")) return "Events are listed in the Events section.";
            if (q.includes("announcement")) return "Announcements are listed in the School Announcements section.";
            if (q.includes("register") || q.includes("join")) return "Ask a club officer for the registration code. Admin and Developer also need their own access code.";
            return "I'm here to help. Ask about events, announcements, or a tour of the website.";
        }

        // Website Tour
        function startWebsiteTour() {
            hideVerityChat();
            const steps = [
                { el: "events", text: "Here are the Events." },
                { el: "announcements", text: "Here are the School Announcements." },
                { el: "about", text: "Here is the About section." },
                { el: "home", text: "And this is the home page." }
            ];
            (async function runTour() {
                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const target = document.getElementById(step.el);
                    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
                    showVerityOrbBubble(step.text);
                    if (verityVoiceEnabled) await speakVerity(step.text);
                    await new Promise(function (resolve) { setTimeout(resolve, 1600); });
                }
                hideVerityOrbBubble();
            })();
        }

        // Dashboard
        function showDashboard() {
            if (!currentUser) { showLoginModal(); return; }
            document.getElementById('dashboard-overlay').classList.remove('hidden');
            document.getElementById('dashboard-overlay').classList.add('flex');
            document.getElementById('dashboard-role-badge').textContent = currentUser.role.toUpperCase();
            switchDashboardTab('overview'); // Default to overview with button for members
        }

        function hideDashboard() {
            document.getElementById('dashboard-overlay').classList.remove('flex');
            document.getElementById('dashboard-overlay').classList.add('hidden');
        }

        function changeAvatar() {
            const newAvatar = prompt("Enter new avatar image URL (leave empty for default pfp.jpg):", currentUser.avatar || "pfp.jpg");
            
            if (newAvatar !== null) {
                currentUser.avatar = newAvatar.trim() || "pfp.jpg";
                safeStorage.setItem("mm_currentUser", JSON.stringify(currentUser));
                
                const idx = users.findIndex(u => u.id === currentUser.id);
                if (idx !== -1) {
                    users[idx].avatar = currentUser.avatar;
                    safeStorage.setItem("mm_users", JSON.stringify(users));
                }
                
                updateNavUser();
                showToast("Avatar updated successfully!");
            }
        }

        function switchDashboardTab(tab) {
            const content = document.getElementById('dashboard-content');
            content.innerHTML = '';
            
            if (tab === 'overview') {
                // Overview with button to view members
                content.innerHTML = `
                    <h3 class="text-2xl font-semibold mb-4">Welcome back, ${currentUser.username}!</h3>
                    
                    <div class="glass p-8 rounded-3xl mb-6 text-center">
                        <div class="text-6xl mb-4">👥</div>
                        <h4 class="text-xl font-semibold mb-2">Member Directory</h4>
                        <p class="text-[#B8B8D0] mb-6">See all active members and their status</p>
                        
                        <button onclick="switchDashboardTab('members')" 
                                class="btn-gold px-8 py-3 rounded-2xl font-semibold flex items-center gap-x-2 mx-auto">
                            <i class="fa-solid fa-users"></i>
                            <span>View All Members</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="glass p-5 rounded-3xl">
                            <div class="text-xs text-white/50">YOUR ROLE</div>
                            <div class="text-3xl font-bold mt-1">${currentUser.role}</div>
                        </div>
                        <div class="glass p-5 rounded-3xl">
                            <div class="text-xs text-white/50">OFFICER POSITION</div>
                            <div class="text-3xl font-bold mt-1">${currentUser.officerRole || 'Member'}</div>
                        </div>
                        <div class="glass p-5 rounded-3xl">
                            <div class="text-xs text-white/50">STATUS</div>
                            <div class="text-3xl font-bold mt-1 text-emerald-400">Active</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            if (tab === 'members') {
                // Member Directory
                let html = `
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h3 class="text-2xl font-semibold">Member Directory</h3>
                            <p class="text-sm text-white/50">All active members of Multi Media</p>
                        </div>
                        <div class="text-sm px-4 py-1.5 rounded-2xl bg-white/5">
                            ${users.filter(u => u.active !== false).length} Members
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                `;
                
                const activeUsers = users.filter(u => u.active !== false);
                
                activeUsers.forEach(member => {
                    const isOnline = member.online;
                    const officerBadge = member.officerRole 
                        ? `<span class="px-2.5 py-px text-[10px] rounded bg-[#FFD700] text-[#0A0A1F] font-bold">${member.officerRole}</span>` 
                        : '';
                    
                    html += `
                        <div class="glass p-5 rounded-3xl flex gap-x-4">
                            <img src="https://i.pravatar.cc/48?u=${member.id}" class="w-12 h-12 rounded-2xl flex-shrink-0 ring-1 ring-white/20">
                            
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-x-2">
                                    <span class="font-semibold">${member.username}</span>
                                    ${officerBadge}
                                </div>
                                <div class="text-sm text-white/60">${member.role}</div>
                                
                                <div class="mt-3 flex items-center gap-x-2">
                                    <span class="inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-gray-500'}"></span>
                                    <span class="text-xs ${isOnline ? 'text-emerald-400' : 'text-gray-400'}">
                                        ${isOnline ? 'Active Now' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `</div>`;
                content.innerHTML = html;
                
            } else if (tab === 'media') {
                content.innerHTML = `<h4 class="font-semibold mb-4">Media Gallery</h4><div class="text-sm text-white/60">Upload feature available in full version. (Demo)</div>`;
            } else {
                content.innerHTML = `<div class="text-white/60">This section is available in the full dashboard.</div>`;
            }
        }

        // Modals
        function showLoginModal() { document.getElementById('login-modal').classList.remove('hidden'); document.getElementById('login-modal').classList.add('flex'); }
        function hideLoginModal() { document.getElementById('login-modal').classList.remove('flex'); document.getElementById('login-modal').classList.add('hidden'); }
        function showRegisterModal() { document.getElementById('register-modal').classList.remove('hidden'); document.getElementById('register-modal').classList.add('flex'); }
        function hideRegisterModal() { document.getElementById('register-modal').classList.remove('flex'); document.getElementById('register-modal').classList.add('hidden'); }

        function filterAnnouncementsInit() {
            const container = document.getElementById('announcement-filters');
            const cats = ['all','General','Event'];
            container.innerHTML = cats.map(c => `<button onclick="setFilter('${c}', this)" class="filter-chip text-xs ${c==='all'?'active':''}">${c}</button>`).join('');
        }
        
        function setFilter(f, el) {
            currentFilter = f;
            document.querySelectorAll('#announcement-filters .filter-chip').forEach(e => e.classList.remove('active'));
            el.classList.add('active');
            filterAnnouncements();
        }

        function toggleTheme() {
            const body = document.body;
            const icon = document.getElementById('theme-icon');
            
            if (body.classList.contains('light-mode')) {
                body.classList.remove('light-mode');
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-adjust');
                localStorage.setItem('mm_theme', 'dark');
            } else {
                body.classList.add('light-mode');
                icon.classList.remove('fa-adjust');
                icon.classList.add('fa-sun');
                localStorage.setItem('mm_theme', 'light');
            }
        }

        // Load saved theme
        function loadTheme() {
            if (localStorage.getItem('mm_theme') === 'light') {
                document.body.classList.add('light-mode');
                const icon = document.getElementById('theme-icon');
                if (icon) {
                    icon.classList.remove('fa-adjust');
                    icon.classList.add('fa-sun');
                }
            }
        }

        function initEverything() {
            // Hide unique loading screen
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.style.transition = 'opacity 0.6s ease';
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.remove();
                        
                        setTimeout(() => {
                            if (!verityGreetingAdded) {
                                verityGreetingAdded = true;
                                addVerityMessage("Hellooo, I'm Verity, your personal assistant. Ask me to show you around by clicking the Show me around button.", { speak: true });
                                const chatContainer = document.getElementById('chat-messages');
                                const replyDiv = document.createElement('div');
                                replyDiv.className = 'flex gap-2 mt-2 verity-quick-replies';
                                replyDiv.innerHTML = `
                                    <button onclick="startWebsiteTour();" 
                                            class="px-4 py-1.5 text-sm rounded-2xl bg-[#FFD700] text-[#0A0A1F] font-medium">
                                        Show me around
                                    </button>
                                    <button onclick="hideVerityChat()" 
                                            class="px-4 py-1.5 text-sm rounded-2xl border border-white/30">
                                        No thanks
                                    </button>
                                `;
                                chatContainer.appendChild(replyDiv);
                            }
                            showVerityChat();
                        }, 200);
                    }, 600);
                }, 1600);
            }

            initTailwind();
            initAudio();
            initKonami();
            loadTheme();
            loadVerityVoicePreference();
            loadData();
            updateNavUser();
            renderEvents();
            renderAnnouncements();
            filterAnnouncementsInit();
            

            // Welcome message (no Konami mention)
            setTimeout(() => {
                if (!safeStorage.getItem('mm_welcomed')) {
                    showToast('Welcome to the Multi Media Club!', 'info');
                    safeStorage.setItem('mm_welcomed', 'true');
                }
            }, 4500);
            
            // Ctrl + A for Admin Panel
            document.addEventListener("keydown", function(e) {
                if (e.ctrlKey && e.key.toLowerCase() === "a") {
                    e.preventDefault();
                    if (currentUser && currentUser.role === "Admin") {
                        showAdminPanel();
                    } else {
                        showToast("Admin access required. Use ↑↑↓↓→← + 2254 to become Admin.", "info");
                    }
                }
            });
            
            console.log('%c[Multi Media Final] Loaded successfully with all features!', 'color:#FFD700');

            // === Web Vitals Measurement ===
            if (typeof webVitals !== 'undefined') {
                console.log('%c[Web Vitals] Performance monitoring enabled. Check console for metrics.', 'color:#4ade80');
                webVitals.onCLS(console.log);
                webVitals.onFID(console.log);
                webVitals.onLCP(console.log);
                webVitals.onFCP(console.log);
                webVitals.onTTFB(console.log);
                
                if (webVitals.onINP) webVitals.onINP(console.log);
            } else {
                console.log('%c[Web Vitals] Library not available.', 'color:#f87171');
            }
        }

        window.onload = initEverything;
        
        // Make functions global
        window.showVerityChat = showVerityChat;
        window.hideVerityChat = hideVerityChat;
        window.toggleVerityVoice = toggleVerityVoice;
        window.startWebsiteTour = startWebsiteTour;
        window.showLoginModal = showLoginModal;
        window.showRegisterModal = showRegisterModal;
        window.showDashboard = showDashboard;
        window.toggleMusic = toggleMusic;
    
