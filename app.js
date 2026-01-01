document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURATION ---
    const ACTIVITY_URL = 'activities.json';
    const LIBRARY_URL = 'library.json';
    
    // Mapping our codes to Browser TTS codes
    const TTS_CODES = {
        'en': 'en-US',
        'it': 'it-IT',
        'de': 'de-DE',
        'es': 'es-ES',
        'ru': 'ru-RU'
    };

    // State
    let currentLang = 'en'; 
    let currentView = 'view-scripts'; 
    let availableVoices = []; // Store voices
    let activeFilter = 'all'; // الفلتر الحالي

    // --- 2. DOM ELEMENTS ---
    const scriptsContainer = document.getElementById('view-scripts');
    const activitiesContainer = document.getElementById('view-activities');
    const libraryContainer = document.getElementById('view-library');
    const notesContainer = document.getElementById('notes-container');
    const navButtons = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view-section');
    const searchInput = document.getElementById('searchInput');
    const langSelect = document.getElementById('lang-switch');
    const toast = document.getElementById('toast');
    const noteForm = document.getElementById('add-note-form');
    const noteInput = document.getElementById('new-note-input');

    // --- 3. INIT ---
    function init() {
        setupNavigation();
        setupSearch();
        setupFilters();
        setupNotes();
        setupLanguageSwitch();
        
        // Pre-load voices for TTS
        if ('speechSynthesis' in window) {
            // Chrome loads voices asynchronously
            window.speechSynthesis.onvoiceschanged = () => {
                availableVoices = window.speechSynthesis.getVoices();
            };
            // Try getting them immediately just in case
            availableVoices = window.speechSynthesis.getVoices();
        }

        fetchScripts(currentLang);
        fetchActivities();
        fetchLibrary();
        loadUserNotes();
    }

    // --- 4. DATA FETCHING ---
    async function fetchScripts(lang) {
        const url = `content_${lang}.json`;
        scriptsContainer.innerHTML = '<p style="text-align:center; padding:20px; color:#aaa;">Loading scripts...</p>';
        try {
            const res = await fetch(url);
            if(!res.ok) throw new Error(`File ${url} not found`);
            const data = await res.json();
            renderScripts(data.modules);
        } catch (error) {
            console.error('Script Error:', error);
            scriptsContainer.innerHTML = `<p style="color:var(--danger); text-align:center;">Error loading ${url}</p>`;
        }
    }

    async function fetchActivities() {
        try {
            const res = await fetch(ACTIVITY_URL);
            const data = await res.json();
            renderActivities(data);
        } catch (error) { console.error('Activity Error:', error); }
    }

    async function fetchLibrary() {
        try {
            const res = await fetch(LIBRARY_URL);
            const data = await res.json();
            renderLibrary(data);
        } catch (error) { console.error('Library Error:', error); }
    }

    // --- 5. RENDER LOGIC ---

    function renderScripts(modules) {
        scriptsContainer.innerHTML = '';
        const query = searchInput.value.toLowerCase();
        // هل فيه بحث؟ لو فيه، هنفتح كل القوائم
        const isSearching = query.length > 0;

        if(!modules) return;

        modules.forEach(mod => {
            // 1. إنشاء الحاوية الكبيرة (Module - Level 1)
            const moduleBlock = document.createElement('div');
            moduleBlock.className = 'level-1-block';
            if(isSearching) moduleBlock.classList.add('open');

            // رأس الموديول
            const modHeader = document.createElement('div');
            modHeader.className = 'level-1-header';
            modHeader.innerHTML = `
                <h3 class="level-1-title">${mod.title}</h3>
                <span class="toggle-icon">▼</span>
            `;
            // وظيفة الضغط
            modHeader.addEventListener('click', () => moduleBlock.classList.toggle('open'));

            // محتوى الموديول (اللي هيشيل الـ Categories)
            const modContent = document.createElement('div');
            modContent.className = 'level-1-content';

            let hasVisibleCategories = false;

            mod.categories.forEach(cat => {
                // فلترة الجمل داخل الكاتيجوري
                const filteredPhrases = cat.phrases.filter(phrase => 
                    phrase.toLowerCase().includes(query)
                );

                if (filteredPhrases.length > 0) {
                    hasVisibleCategories = true;

                    // 2. إنشاء حاوية الكاتيجوري (Category - Level 2)
                    const catBlock = document.createElement('div');
                    catBlock.className = 'level-2-block';
                    if(isSearching) catBlock.classList.add('open');

                    // رأس الكاتيجوري
                    const catHeader = document.createElement('div');
                    catHeader.className = 'level-2-header';
                    catHeader.innerHTML = `
                        <h4 class="level-2-title">${cat.title}</h4>
                        <span class="toggle-icon">▼</span>
                    `;
                    catHeader.addEventListener('click', (e) => {
                        e.stopPropagation(); // عشان ميعملش تريجر للي فوقه
                        catBlock.classList.toggle('open');
                    });

                    // حاوية الجمل
                    const phrasesDiv = document.createElement('div');
                    phrasesDiv.className = 'level-2-content';

                    filteredPhrases.forEach(text => {
                        // هنا السكريبت مفيهوش عربي في ملف JSON الحالي، فبنعرض النص بس
                        const card = createCard(text, true, currentLang); 
                        phrasesDiv.appendChild(card);
                    });

                    catBlock.appendChild(catHeader);
                    catBlock.appendChild(phrasesDiv);
                    modContent.appendChild(catBlock);
                }
            });

            // لو الموديول فيه كاتيجوريز مطابقة للبحث، اعرضه
            if (hasVisibleCategories) {
                moduleBlock.appendChild(modHeader);
                moduleBlock.appendChild(modContent);
                scriptsContainer.appendChild(moduleBlock);
            }
        });
        
        if (scriptsContainer.innerHTML === '') {
            scriptsContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#666;"><p>No matches found.</p></div>';
        }
    }

    function renderActivities(data) {
        activitiesContainer.innerHTML = '';
        
        if(!data.categories) return;

        data.categories.forEach(cat => {
            // --- Level 1: Activity Block (e.g., Zumba) ---
            const activityBlock = document.createElement('div');
            activityBlock.className = 'level-1-block';

            // Header
            const header = document.createElement('div');
            header.className = 'level-1-header';
            header.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-size:1.6rem">${cat.icon}</span>
                    <div>
                        <h3 class="level-1-title">${cat.title}</h3>
                        <div style="font-size:0.75rem; color:#888;">BPM: ${cat.bpm_range}</div>
                    </div>
                </div>
                <span class="toggle-icon">▼</span>
            `;
            header.addEventListener('click', () => activityBlock.classList.toggle('open'));

            // Content
            const content = document.createElement('div');
            content.className = 'level-1-content';

            // الوصف
            if (cat.description) {
                const desc = document.createElement('div');
                desc.style.cssText = "padding: 0 10px 15px; color: #ccc; font-size: 0.9rem; font-style: italic;";
                desc.textContent = cat.description;
                content.appendChild(desc);
            }

            // --- Level 2: Sections (Moves / Music / Safety) ---
            cat.sections.forEach(section => {
                const sectionBlock = document.createElement('div');
                sectionBlock.className = 'level-2-block';

                // Section Header
                const secHeader = document.createElement('div');
                secHeader.className = 'level-2-header';
                
                // نحدد أيقونة بناءً على نوع القسم
                let icon = '📌';
                if (section.type === 'music' || section.type === 'playlist') icon = '🎵';
                if (section.type === 'moves') icon = '👟';
                if (section.type === 'safety') icon = '⚠️';

                secHeader.innerHTML = `
                    <h4 class="level-2-title">${icon} ${section.title}</h4>
                    <span class="toggle-icon">▼</span>
                `;
                
                secHeader.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sectionBlock.classList.toggle('open');
                });

                // Section Content
                const secContent = document.createElement('div');
                secContent.className = 'level-2-content';

                // --- 1. عرض الأغاني (Music) ---
                if (section.type === 'music' || section.type === 'playlist') {
                    section.items.forEach(song => {
                        // إنشاء رابط بحث يوتيوب ذكي
                        const query = encodeURIComponent(`${song.title} ${song.artist} lyrics`);
                        const youtubeLink = `https://www.youtube.com/results?search_query=${query}`;

                        const musicDiv = document.createElement('div');
                        musicDiv.className = 'music-item';
                        musicDiv.innerHTML = `
                            <div class="music-details">
                                <span class="music-title">${song.title}</span>
                                <div class="music-meta">
                                    <span>${song.artist}</span>
                                    ${song.bpm ? `<span class="bpm-tag">${song.bpm}</span>` : ''}
                                    ${song.usage ? `<span class="usage-tag">• ${song.usage}</span>` : ''}
                                </div>
                            </div>
                            <a href="${youtubeLink}" target="_blank" class="play-btn">▶</a>
                        `;
                        secContent.appendChild(musicDiv);
                    });
                } 
                // --- 2. عرض الحركات (Moves / Routines) ---
                else {
                    section.items.forEach(item => {
                        // لو العنصر مجرد نص (String) زي في قسم Safety
                        if (typeof item === 'string') {
                            const simpleItem = document.createElement('div');
                            simpleItem.className = 'move-item';
                            simpleItem.innerHTML = `<span class="move-desc" style="color:#fff;">• ${item}</span>`;
                            secContent.appendChild(simpleItem);
                        } 
                        // لو العنصر كائن (Object) فيه تفاصيل
                        else {
                            const moveDiv = document.createElement('div');
                            moveDiv.className = 'move-item';
                            moveDiv.innerHTML = `
                                <div class="move-header">
                                    <span class="move-name">${item.name || item.title}</span>
                                </div>
                                ${item.description ? `<div class="move-desc">${item.description}</div>` : ''}
                                ${item.steps ? `<div class="move-desc">${item.steps.join('<br>')}</div>` : ''}
                                ${item.cue ? `<div class="move-cue-box">🗣️ "${item.cue}"</div>` : ''}
                            `;
                            secContent.appendChild(moveDiv);
                        }
                    });
                }

                sectionBlock.appendChild(secHeader);
                sectionBlock.appendChild(secContent);
                content.appendChild(sectionBlock);
            });

            activityBlock.appendChild(header);
            activityBlock.appendChild(content);
            activitiesContainer.appendChild(activityBlock);
        });
    }

    function renderLibrary(data) {
        libraryContainer.innerHTML = '';
        
        const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
        const isSearching = searchVal.length > 0 || activeFilter !== 'all';

        const chapters = Array.isArray(data) ? data : data.chapters;
        if (!chapters) return;

        chapters.forEach(chap => {
            // 1. إنشاء الحاوية الكبيرة (Chapter - Level 1)
            const chapBlock = document.createElement('div');
            chapBlock.className = 'level-1-block';
            if(isSearching) chapBlock.classList.add('open');

            // رأس الشابتر
            const chapHeader = document.createElement('div');
            chapHeader.className = 'level-1-header';
            chapHeader.innerHTML = `
                <h3 class="level-1-title">${chap.title}</h3>
                <span class="toggle-icon">▼</span>
            `;
            chapHeader.addEventListener('click', () => chapBlock.classList.toggle('open'));

            // محتوى الشابتر
            const chapContent = document.createElement('div');
            chapContent.className = 'level-1-content';

            let hasVisibleTopics = false;

            chap.topics.forEach(topic => {
                // فلترة الجمل
                const filteredPhrases = topic.phrases.filter(p => {
                    const textEn = p.en.toLowerCase();
                    const textAr = p.ar ? p.ar.toLowerCase() : '';
                    
                    const matchesSearch = textEn.includes(searchVal) || textAr.includes(searchVal);
                    
                    let matchesFilter = true;
                    if (activeFilter !== 'all') {
                        matchesFilter = textEn.includes(activeFilter.toLowerCase());
                    }

                    return matchesSearch && matchesFilter;
                });

                if (filteredPhrases.length > 0) {
                    hasVisibleTopics = true;

                    // 2. إنشاء حاوية التوبيك (Topic - Level 2)
                    const topicBlock = document.createElement('div');
                    topicBlock.className = 'level-2-block';
                    if(isSearching) topicBlock.classList.add('open');

                    // رأس التوبيك
                    const topicHeader = document.createElement('div');
                    topicHeader.className = 'level-2-header';
                    topicHeader.innerHTML = `
                        <h4 class="level-2-title">${topic.title}</h4>
                        <span class="toggle-icon">▼</span>
                    `;
                    topicHeader.addEventListener('click', (e) => {
                        e.stopPropagation();
                        topicBlock.classList.toggle('open');
                    });

                    // حاوية الجمل
                    const phrasesContainer = document.createElement('div');
                    phrasesContainer.className = 'level-2-content';

                    filteredPhrases.forEach(phrase => {
                        const mainText = phrase[currentLang] || phrase.en;
                        const subText = (currentLang === 'ar') ? phrase.en : phrase.ar;
                        const card = createCard(mainText, true, currentLang, subText);
                        phrasesContainer.appendChild(card);
                    });

                    topicBlock.appendChild(topicHeader);
                    topicBlock.appendChild(phrasesContainer);
                    chapContent.appendChild(topicBlock);
                }
            });

            // لو الشابتر فيه توبيكس، اعرضه
            if (hasVisibleTopics) {
                chapBlock.appendChild(chapHeader);
                chapBlock.appendChild(chapContent);
                libraryContainer.appendChild(chapBlock);
            }
        });

        if (libraryContainer.innerHTML === '') {
            libraryContainer.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <div style="font-size:3rem; margin-bottom:10px;">🔍</div>
                    <p>No results found.</p>
                </div>
            `;
        }
    }

    // --- 6. FILTERS SETUP ---
    function setupFilters() {
        const filterSelect = document.getElementById('filter-switch');
        
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                activeFilter = e.target.value;
                loadLibraryData();
            });
        }
    }

    function loadLibraryData() {
        fetchLibrary();
    }

    // --- 7. HELPER FUNCTIONS ---

    function createAccordion(titleHtml, id) {
        const div = document.createElement('div');
        div.className = 'module-container';
        if(id) div.id = id;
        div.innerHTML = `<div class="module-header"><span>${titleHtml}</span></div><div class="module-content"></div>`;
        div.querySelector('.module-header').onclick = () => div.classList.toggle('open');
        return div;
    }

    function createCard(text, withAudio = false, langCode = 'en', subText = '') {
        const div = document.createElement('div');
        div.className = 'card phrase-card';
        
        if (subText) {
            div.innerHTML = `<div style="flex: 1;"><div class="card-text" style="font-weight: 600;">${text}</div><div style="font-size: 0.85rem; color: #999; margin-top: 4px;">${subText}</div></div>`;
        } else {
            div.innerHTML = `<span class="card-text">${text}</span>`;
        }
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'action-buttons';

        if (withAudio) {
            const speakBtn = document.createElement('button');
            speakBtn.className = 'icon-btn speak-btn';
            speakBtn.innerHTML = '🔊';
            // Pass the correct language code to speakText
            speakBtn.onclick = (e) => { e.stopPropagation(); speakText(text, langCode); };
            actionsDiv.appendChild(speakBtn);
        }

        const copyBtn = document.createElement('button');
        copyBtn.className = 'icon-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.onclick = (e) => { e.stopPropagation(); copyToClipboard(text); };
        actionsDiv.appendChild(copyBtn);

        div.appendChild(actionsDiv);
        return div;
    }

    function speakText(text, lang) {
        // 1. Stop any current speech
        window.speechSynthesis.cancel();

        // 2. Define the target language code clearly
        const targetLang = TTS_CODES[lang] || 'en-US';

        // 3. Setup the utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLang; // This alone helps iOS sometimes
        utterance.rate = 0.9; // Slightly slower is better for learning

        // 4. SMART VOICE SELECTION (Mobile Optimized)
        // Re-fetch voices instantly (Crucial for mobile Safari/Chrome)
        let voices = window.speechSynthesis.getVoices();
        
        // Strategy A: Exact Match (e.g., it-IT)
        let selectedVoice = voices.find(v => v.lang === targetLang);

        // Strategy B: General Match (e.g., 'it' inside 'it-IT')
        if (!selectedVoice) {
            const shortCode = targetLang.split('-')[0]; // 'it' from 'it-IT'
            selectedVoice = voices.find(v => v.lang.startsWith(shortCode));
        }

        // Strategy C: iOS Fallback (Don't force voice if not found, rely on lang prop)
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log('Voice found:', selectedVoice.name);
        } else {
            console.warn('No voice found for', targetLang, '- Relying on OS default');
            // iOS tries to match 'utterance.lang' automatically if we don't force a bad voice
        }

        // 5. Speak
        window.speechSynthesis.speak(utterance);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
    }

    function showToast(msg) {
        toast.innerText = msg;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    }

    // --- 7. NAVIGATION & SEARCH ---
    function setupNavigation() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const targetId = btn.getAttribute('data-target');
                currentView = targetId; 
                
                views.forEach(v => {
                    v.classList.add('hidden');
                    v.classList.remove('active');
                    if(v.id === targetId) {
                        v.classList.remove('hidden');
                        v.classList.add('active');
                    }
                });
                
                searchInput.value = ''; 
                searchInput.placeholder = `Search ${btn.querySelector('.label').innerText}...`;
            });
        });
    }

    function setupSearch() {
        searchInput.addEventListener('input', (e) => {
            const activeContainer = document.getElementById(currentView);
            
            // إذا كان المستخدم في مقطع المكتبة، أعد تحميل البيانات
            if (currentView === 'view-library') {
                loadLibraryData();
            } else if (currentView === 'view-scripts') {
                // لمقطع Scripts، أعد تحميل البيانات لتفعيل البحث في accordion
                fetchScripts(currentLang);
            } else {
                // للمقاطع الأخرى، استخدم البحث السريع
                const query = e.target.value.toLowerCase();
                const cards = activeContainer.querySelectorAll('.phrase-card, .activity-card');
                
                cards.forEach(card => {
                    const text = card.innerText.toLowerCase();
                    const parentModule = card.closest('.module-container');
                    if (text.includes(query)) {
                        card.style.display = 'flex';
                        if(query.length > 1 && parentModule) parentModule.classList.add('open');
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    }

    function setupLanguageSwitch() {
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            fetchScripts(currentLang);
        });
    }

    // --- 8. NOTES ---
    function setupNotes() {
        if(!noteForm) return;
        noteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = noteInput.value.trim();
            if(text) { saveNote(text); noteInput.value = ''; }
        });
    }
    function loadUserNotes() {
        const notes = JSON.parse(localStorage.getItem('animationNotes')) || [];
        renderNotes(notes);
    }
    function saveNote(text) {
        const notes = JSON.parse(localStorage.getItem('animationNotes')) || [];
        notes.push(text);
        localStorage.setItem('animationNotes', JSON.stringify(notes));
        renderNotes(notes);
    }
    function renderNotes(notes) {
        notesContainer.innerHTML = '';
        notes.forEach((note, index) => {
            const card = createCard(note, true, 'en');
            const delBtn = document.createElement('span');
            delBtn.className = 'delete-btn';
            delBtn.innerHTML = '🗑️';
            delBtn.onclick = () => deleteNote(index);
            card.querySelector('.action-buttons').appendChild(delBtn);
            notesContainer.appendChild(card);
        });
    }
    window.deleteNote = function(index) {
        let notes = JSON.parse(localStorage.getItem('animationNotes'));
        notes.splice(index, 1);
        localStorage.setItem('animationNotes', JSON.stringify(notes));
        renderNotes(notes);
    }

    init();
});