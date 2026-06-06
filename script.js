    let allEntries = [];
    let currentPage = 'dashboard';
    let timerInterval = null;
    let timerSeconds = 0;
    let detectionLogEntries = [];
    let deleteTargetId = null;
    document.addEventListener('DOMContentLoaded', () => {
      initializeApp();
    });
    function syncMatters() {
      const saved = JSON.parse(localStorage.getItem('mattersStore')) || [];
      mattersStore = saved;
    }
    // Load entries from localStorage
    function loadEntries() {
      const savedEntries = localStorage.getItem('timeEntries');
      if (savedEntries) {
        allEntries = JSON.parse(savedEntries);
      }
    }
    // Save entries to localStorage
    function saveEntries() {
      localStorage.setItem('timeEntries', JSON.stringify(allEntries));
    }
    function initializeApp() {
      //localStorage.removeItem('timeEntries');
      loadEntries(); // Load saved entries first
      if (!localStorage.getItem('clientsStore')) {
        saveClientsStore();
      }
      if (!localStorage.getItem('mattersStore')) {
        saveMattersStore();
      }
      syncMatters();

      if (typeof lucide !== 'undefined') lucide.createIcons();
      setupFormHandlers();
      setupDeleteHandler();
      setupModalHandlers();
      updateUI();
      navigateTo('dashboard');
      currentRole = localStorage.getItem('currentRole') || 'admin';
      currentUserName = localStorage.getItem('currentUserName') || 'Siyabonga Makhubu';
      const savedInitials = currentUserName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
      document.getElementById('userAvatar').textContent = savedInitials;
      document.getElementById('currentUserName').textContent = currentUserName;
      applyRolePermissions();
    }

    function setupFormHandlers() {
      const quickAddForm = document.getElementById('quickAddForm');
      if (quickAddForm) {
        quickAddForm.addEventListener('submit', (e) => {
          e.preventDefault();
          addQuickEntry();
        });
      }
    }

    function setupDeleteHandler() {
      const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
          if (deleteTargetId) {
            allEntries = allEntries.filter(e => e.id !== deleteTargetId);
            saveEntries();
            closeDeleteModal();
            showToast('Entry deleted', 'success');
            updateUI();
          }
        });
      }
    }

    function setupModalHandlers() {
      document.addEventListener('click', (e) => {
        if (e.target.id === 'invoiceModal') {
          closeInvoiceModal();
        }
        if (e.target.id === 'deleteModal') {
          closeDeleteModal();
        }
      });
    }

    function createEntry(
      clientData,
      category,
      description,
      durationMinutes,
      source = 'manual'
    ) {
      let clientName = 'Unknown Client';
      let matterNumber = 'General';
      let matterTitle = '';
      // STRING FORMAT
      if (typeof clientData === 'string') {
        const parts = clientData.split(' - ');
        clientName = parts[0]?.trim() || 'Unknown Client';
        matterNumber = parts[1]?.trim() || 'General';
      }
      // OBJECT FORMAT
      else if (clientData && typeof clientData === 'object') {
        clientName =
          clientData.clientName?.trim() ||
          clientData.client?.trim() ||
          'Unknown Client';
        matterNumber =
          clientData.matterNumber?.trim() ||
          clientData.matter?.trim() ||
          'General';

        matterTitle =
          clientData.matterTitle?.trim() || '';
      }
      const durationHours = durationMinutes / 60;
      const billableAmount = durationHours * 2500;
      return {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        client: clientName,
        matter: matterNumber,
        matterTitle,
        category,
        description,
        duration: durationMinutes,
        durationHours: parseFloat(durationHours.toFixed(2)),
        amount: Math.round(billableAmount),
        status: 'pending',
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        units: Math.ceil(durationMinutes / 6),
        // FIXED
        source: source === 'auto-detect' ? 'auto' : source
      };
    }
    function addQuickEntry() {
      const client = document.getElementById('qaClient').value;
      const category = document.getElementById('qaCategory').value;
      const description = document.getElementById('qaDesc').value;
      const duration =
        parseInt(document.getElementById('qaDuration').value) || 30;
      if (!client || !description) {
        showToast('Please fill in all fields', 'error');
        return;
      }
      const entry = createEntry(
        client,
        category,
        description,
        duration,
        'manual'
      );
      allEntries.push(entry);
      // IMPORTANT
      saveEntries();
      document.getElementById('qaDesc').value = '';
      document.getElementById('qaDuration').value = '30';
      showToast('Entry added successfully', 'success');
      updateUI();
    }

    function toggleEntryStatus(entryId) {
      const entry = allEntries.find(e => e.id === entryId);
      if (entry) {
        entry.status = entry.status === 'approved'
          ? 'pending'
          : 'approved';
        saveEntries();
        updateUI();
      }
    }
    function toggleTimer() {
    const startBtn = document.getElementById('timerStartBtn');
    const saveBtn = document.getElementById('timerSaveBtn');
    const display = document.getElementById('timerDisplay');

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
      startBtn.innerHTML = '<i data-lucide="play" style="width:18px;height:18px;"></i> Start';
      display.classList.remove('running');
      // hide save button when stopped
      saveBtn.classList.add('hidden');
    } else {
      startBtn.innerHTML = '<i data-lucide="pause" style="width:18px;height:18px;"></i> Pause';
      display.classList.add('running');
      // show save button when running
      saveBtn.classList.remove('hidden');
      timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
      }, 1000);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

    function updateTimerDisplay() {
      const display = document.getElementById('timerDisplay');
      const unitsDisplay = document.getElementById('timerUnits');
      const hours = Math.floor(timerSeconds / 3600);
      const minutes = Math.floor((timerSeconds % 3600) / 60);
      const seconds = timerSeconds % 60;
      const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      display.textContent = timeStr;
      const totalMinutes = timerSeconds / 60;
      const units = Math.ceil(totalMinutes / 6);
      unitsDisplay.textContent = `${units} units (6-min increments)`;
    }

    function saveTimer() {
      if (timerSeconds === 0) {
        showToast('Timer must run for at least 6 minutes', 'error');
        return;
      }
      const client = document.getElementById('timerClient').value;
      const category = document.getElementById('timerCategory').value;
      const description = document.getElementById('timerDesc').value;
      if (!description) {
        showToast('Please add a description', 'error');
        return;
      }
      const durationMinutes = Math.ceil((timerSeconds / 60) / 6) * 6;
      const entry = createEntry(client, category, description, durationMinutes, 'timer');
      allEntries.push(entry);
      saveEntries();
      clearInterval(timerInterval);
      timerInterval = null;
      timerSeconds = 0;
      document.getElementById('timerDisplay').textContent = '00:00:00';
      document.getElementById('timerDisplay').classList.remove('running');
      document.getElementById('timerStartBtn').innerHTML = '<i data-lucide="play" style="width:18px;height:18px;"></i> Start';
      document.getElementById('timerSaveBtn').classList.add('hidden');
      document.getElementById('timerDesc').value = '';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      showToast('Entry saved successfully', 'success');
      updateUI();
    }
     let clientsStore =
  JSON.parse(localStorage.getItem('clientsStore')) || [
    { id:1, name:'Ackermans Corp', email:'legal@ackermans.co.za', phone:'+27 11 234 5678', status:'active' },
    { id:2, name:'2Canna Ltd', email:'cfo@2canna.co.za', phone:'+27 21 456 7890', status:'active' },
    { id:3, name:'Maponya Holdings Pty Ltd', email:'accounts@maponya.co.za', phone:'+27 12 345 6789', status:'active' },
    { id:4, name:'Khumalo Family Trust', email:'trust@khumalo.co.za', phone:'+27 31 111 2222', status:'active' },
  ];
  let mattersStore =
  JSON.parse(localStorage.getItem('mattersStore')) || [
    { id:1, title:'Shareholder Dispute', number:'MAT-2026-001', clientId:1, rate:3500, description:'Minority/majority shareholder dividend dispute', status:'open' },
    { id:2, title:'IP Licensing Agreement', number:'MAT-2026-002', clientId:2, rate:4200, description:'Cannabis IP licensing with international partner', status:'open' },
    { id:3, title:'Mining Rights App', number:'MAT-2026-003', clientId:3, rate:3800, description:'Application for mining rights in Limpopo', status:'open' },
    { id:4, title:'Estate Administration', number:'MAT-2026-004', clientId:4, rate:3500, description:'Administration of deceased estate', status:'open' },
  ];
  function saveClientsStore() {
    localStorage.setItem(
      'clientsStore',
      JSON.stringify(clientsStore)
    );
  }

function saveMattersStore() {
  localStorage.setItem(
    'mattersStore',
    JSON.stringify(mattersStore)
  );
}
  // ── ESCAPE ────────────────────────────────────────────────────────────────
  function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  // ── CLIENTS ───────────────────────────────────────────────────────────────
  function renderClients(){
    const grid=document.getElementById('clientGrid'), lbl=document.getElementById('clientCountLabel');
    if(!grid) return;
    lbl.textContent=`${clientsStore.length} client${clientsStore.length!==1?'s':''}`;
    if(!clientsStore.length){ grid.innerHTML='<div class="col-span-3 text-center py-12 text-slate-500 text-sm">No clients yet.</div>'; return; }
    grid.innerHTML=clientsStore.map(c=>`
      <div class="bg-[#1a2332] border border-slate-700/40 rounded-2xl p-5 space-y-3 hover:border-sky-500/40 transition">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
            <i data-lucide="building-2" style="width:18px;height:18px;color:#38bdf8;"></i>
          </div>
          <div>
            <div class="font-bold text-white text-sm">${escHtml(c.name)}</div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-600">${escHtml(c.status)}</span>
          </div>
        </div>
        ${c.email?`<div class="flex items-center gap-2 text-xs text-slate-400"><i data-lucide="mail" style="width:12px;height:12px;"></i>${escHtml(c.email)}</div>`:''}
        ${c.phone?`<div class="flex items-center gap-2 text-xs text-slate-400"><i data-lucide="phone" style="width:12px;height:12px;"></i>${escHtml(c.phone)}</div>`:''}
      </div>`).join('');
    lucide.createIcons();
  }
  function openClientModal(){
    ['clientName','clientEmail','clientPhone','clientAddress'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('clientModal').classList.add('active');
  }
  function closeClientModal(){ document.getElementById('clientModal').classList.remove('active'); }
  function saveClient(){
    const name=document.getElementById('clientName').value.trim();
    if(!name){ alert('Client name is required.'); return; }
    clientsStore.push({ id:Date.now(), name, email:document.getElementById('clientEmail').value.trim(), phone:document.getElementById('clientPhone').value.trim(), status:'active' });
    saveClientsStore();closeClientModal(); renderClients(); populateMatterClientDropdown();
    if(typeof showToast==='function') showToast('Client added!');
  }
  // ── MATTERS ───────────────────────────────────────────────────────────────
  function renderMatters(){
    const grid=document.getElementById('matterGrid'), lbl=document.getElementById('matterCountLabel');
    if(!grid) return;
    lbl.textContent=`${mattersStore.length} matter${mattersStore.length!==1?'s':''}`;
    if(!mattersStore.length){ grid.innerHTML='<div class="col-span-2 text-center py-12 text-slate-500 text-sm">No matters yet.</div>'; return; }
    const sc={open:'text-emerald-400 bg-emerald-500/15',closed:'text-slate-400 bg-slate-700/40',on_hold:'text-amber-400 bg-amber-500/15'};
    grid.innerHTML=mattersStore.map(m=>{
      const client=clientsStore.find(c=>c.id===m.clientId);
      return `
        <div class="bg-[#1a2332] border border-slate-700/40 rounded-2xl p-5 space-y-3 hover:border-sky-500/40 transition">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                <i data-lucide="briefcase" style="width:18px;height:18px;color:#a78bfa;"></i>
              </div>
              <div>
                <div class="font-bold text-white text-sm">${escHtml(m.title)}</div>
                <div class="text-[11px] text-slate-500">${escHtml(m.number)}</div>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${sc[m.status]||sc.open} font-600 shrink-0">${escHtml(m.status)}</span>
          </div>
          <div class="text-xs text-slate-400">Client: ${client?escHtml(client.name):'—'}</div>
          ${m.rate?`<div class="flex items-center gap-1 text-xs text-slate-400"><i data-lucide="banknote" style="width:12px;height:12px;"></i> R${Number(m.rate).toLocaleString()}/hr</div>`:''}
          ${m.description?`<div class="text-xs text-slate-500">${escHtml(m.description)}</div>`:''}
        </div>`;
    }).join('');
    lucide.createIcons();
  }
  function populateMatterClientDropdown(){
    const sel=document.getElementById('matterClient');
    if(!sel) return;
    sel.innerHTML='<option value="">Select client...</option>'+clientsStore.map(c=>`<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
  }
  function openMatterModal(){
    populateMatterClientDropdown();
    ['matterTitle','matterNumber','matterRate','matterDesc'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('matterClient').value='';
    document.getElementById('matterModal').classList.add('active');
  }
  function closeMatterModal(){ document.getElementById('matterModal').classList.remove('active'); }
  function saveMatter() {
      const title = document.getElementById('matterTitle').value.trim();

      if (!title) {
        alert('Matter title is required.');
        return;
      }
      const selectedClientId = document.getElementById('matterClient').value;
      mattersStore.push({
        id: Date.now(),
        title,
        number: document.getElementById('matterNumber').value.trim(),
        clientId: selectedClientId ? Number(selectedClientId) : null,
        rate: document.getElementById('matterRate').value.trim(),
        description: document.getElementById('matterDesc').value.trim(),
        status: 'open'
      });
      saveMattersStore();
      closeMatterModal();
      renderMatters();
      populateClientMatterDropdowns();
      if (typeof showToast === 'function')
        showToast('Matter created!');
  }
  // ── ACTIVITY FEED ─────────────────────────────────────────────────────────
  const activityIcons={ Email:'mail', Meeting:'users', Drafting:'file-text', Call:'phone', Research:'search', Review:'clipboard-list', document:'file-text' };
  const activityDots ={ Email:'bg-blue-500', Meeting:'bg-violet-500', Drafting:'bg-amber-500', Call:'bg-green-500', Research:'bg-indigo-500', Review:'bg-sky-500' };
  function renderActivityFeed(){
    const container=document.getElementById('activityFeedList');
    if(!container) return;
    const entries = [...allEntries].reverse();
    if(!entries.length){ container.innerHTML='<div class="text-center py-12 text-slate-500 text-sm">No activities captured yet</div>'; return; }
    const groups={};
    entries.forEach(e=>{ const d=e.date||'Today'; if(!groups[d]) groups[d]=[]; groups[d].push(e); });
    container.innerHTML=Object.entries(groups).map(([date,items])=>`
      <div>
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-slate-700/60"></div>
          <span class="text-xs text-slate-500 font-600 px-2">${escHtml(date)}</span>
          <div class="h-px flex-1 bg-slate-700/60"></div>
        </div>
        <div class="space-y-2">
          ${items.map(e=>{
            const icon=activityIcons[e.category]||'clock';
            const dot=activityDots[e.category]||'bg-slate-500';
            const badge=e.source==='auto'
              ?`<span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-600 flex items-center gap-1"><i data-lucide="zap" style="width:10px;height:10px;"></i>Auto</span>`
              :`<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 font-600">Manual</span>`;
            return `
              <div class="bg-[#1a2332] border border-slate-700/40 rounded-xl p-4 flex items-start gap-3 hover:border-slate-600/60 transition">
                <div class="w-2 h-2 rounded-full ${dot} mt-2 shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <i data-lucide="${icon}" style="width:13px;height:13px;color:#94a3b8;"></i>
                    <span class="text-xs font-600 text-slate-400">${escHtml(e.category||'')}</span>
                    ${badge}
                  </div>
                  <div class="text-sm text-white">${escHtml(e.description||'')}</div>
                  <div class="text-xs text-slate-500 mt-1">${escHtml(e.client||'')}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-sm font-bold text-white">${e.units||0} units</div>
                  <div class="text-xs text-slate-500">${e.duration||0} min</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`).join('');
    lucide.createIcons();
  }
  // ── HOOK INTO navigateTo ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', ()=>{
    renderClients();
    renderMatters();
    populateClientMatterDropdowns();
    setupMatterDropdownListeners();
    // Patch navigateTo after script.js has defined it
    const orig = window.navigateTo;
    window.navigateTo = function(page){
      if(orig) orig(page);
      if(page==='clients')  renderClients();
      if(page==='matters')  renderMatters();
      if(page==='activity') renderActivityFeed();
      if(page==='reports')  { populateMonthSelector(); renderMonthlyReport(); }
    };
  });
  function populateClientMatterDropdowns() {
    syncMatters();
    const dropdowns = [
      document.getElementById('qaClient'),
      document.getElementById('timerClient'),
      document.getElementById('invClient')
    ];
    dropdowns.forEach(select => {
      if (!select) return;

      let defaultOption =
        select.id === 'invClient'
          ? '<option value="">All Clients</option>'
          : '<option value="">Select Client / Matter</option>';

      select.innerHTML = defaultOption;
      syncMatters();
      mattersStore.forEach(matter => {
        const client = clientsStore.find(
          c => Number(c.id) === Number(matter.clientId)
        );
        const option = document.createElement('option');
        const displayText =
          `${client ? client.name : 'Unknown'} - ${matter.number}`;

        option.value = displayText;
        option.textContent = displayText;
        select.appendChild(option);
      });
      // Add create new matter option
      if (select.id !== 'invClient') {
        const createOption = document.createElement('option');
        createOption.value = '__new_matter__';
        createOption.textContent = '+ Create New Matter';
        select.appendChild(createOption);
      }
    });
  }
  function setupMatterDropdownListeners() {
    ['qaClient', 'timerClient'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.addEventListener('change', () => {
        if (select.value === '__new_matter__') {
          openMatterModal();
          // reset selection
          setTimeout(() => {
            select.selectedIndex = 0;
          }, 100);
        }
      });
    });
  }
    function simulateDetection(type) {
  // Always read FRESH from localStorage
  const savedMatters = JSON.parse(localStorage.getItem('mattersStore')) || [];
  const savedClients = JSON.parse(localStorage.getItem('clientsStore')) || [];
  const descriptions = {
    email: 'Reviewed client correspondence and legal updates',
    meeting: 'Client strategy session - Project scope discussion',
    document: 'Drafted contract amendments and compliance review',
    call: 'Phone consultation with opposing counsel'
  };

  const categories = {
    email: 'Email',
    meeting: 'Meeting',
    document: 'Drafting',
    call: 'Call'
  };
  if (savedMatters.length === 0) {
    showToast('No matters available for auto-detect. Please add a matter first.', 'error');
    return;
  }
  //Before .Map Debburgers
   const availableMatters = savedMatters.map(matter => {

    const client = savedClients.find(
      c => Number(c.id) === Number(matter.clientId)
    );

    return {
      clientName: client?.name || 'Unknown Client',
      matterNumber: matter.number || 'General',
      matterTitle: matter.title || 'Untitled Matter'
    };
  });
  const randomMatter = availableMatters[Math.floor(Math.random() * availableMatters.length)];
  const randomClient = `${randomMatter.clientName} - ${randomMatter.matterNumber}`;
  const duration = [30, 45, 60][Math.floor(Math.random() * 3)];
  const entry = createEntry(
    {
      clientName: randomMatter.clientName,
      matterNumber: randomMatter.matterNumber,
      matterTitle: randomMatter.matterTitle
    },
    categories[type],
    descriptions[type],
    duration,
    'auto'
  );
  allEntries.push(entry);
  saveEntries();
  const logEntry = {
    type,
    description: descriptions[type],
    timestamp: new Date().toLocaleTimeString(),
    client: randomMatter.clientName,
    matter: randomMatter.matterNumber
  };

  detectionLogEntries.unshift(logEntry);
  if (detectionLogEntries.length > 10) detectionLogEntries.pop();

  updateDetectionLog();
  showToast(`${type} activity auto-captured for ${randomMatter.matterNumber}`, 'success');
  updateUI();
}
    function updateDetectionLog() {
      const logList = document.getElementById('detectionLogList');
      if (!logList) return;

      if (detectionLogEntries.length === 0) {
        logList.innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Click a detection button to simulate auto-capture</div>';
        return;
      }

      logList.innerHTML = detectionLogEntries.map(entry => `
        <div class="flex items-start justify-between p-3 rounded-lg bg-[#0f172a] border border-slate-700/30">
          <div>
            <p class="text-sm font-500 text-slate-300">${entry.description}</p>
            <p class="text-xs text-slate-500 mt-1">${entry.client}</p>
          </div>
          <span class="text-xs text-slate-500 whitespace-nowrap ml-3">${entry.timestamp}</span>
        </div>
      `).join('');
    }

    function generateInvoice() {
      const clientFilter = document.getElementById('invClient').value;
      const rate = parseInt(document.getElementById('invRate').value) || 2500;

      let filteredEntries = allEntries.filter(e => e.status === 'approved');
      if (clientFilter) {
        const [selectedClient, selectedMatter] = clientFilter.split(' - ');
        filteredEntries = filteredEntries.filter(e =>
          e.client === selectedClient &&
          e.matter === selectedMatter
        );
      }

      if (filteredEntries.length === 0) {
        showToast('No approved entries to invoice', 'error');
        return;
      }
      const totalHours = filteredEntries.reduce((sum, e) => sum + e.durationHours, 0);
      const totalAmount = Math.round(totalHours * rate);
      generateInvoicePDF(filteredEntries, rate, totalHours, totalAmount, clientFilter);
      showToast('Invoice generated', 'success');
    }

    function generateInvoicePDF(entries, rate, totalHours, totalAmount, clientFilter) {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceDate = new Date().toLocaleDateString();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();
      let entriesHTML = entries.map((entry, idx) => `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${idx + 1}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${entry.client} - ${entry.matter}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${entry.description}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${entry.durationHours.toFixed(2)}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e5e7eb; color: #374151; text-align: right;">R${(entry.durationHours * rate).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const subtotal = totalAmount;
      const vat = Math.round(totalAmount * 0.15);
      const total = subtotal + vat;
      const invoiceHTML = `
        <div class="invoice-pdf" style="background: white; color: #1f2937; padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
            <div style="font-size: 28px; font-weight: 700; color: #000;">INVOICE</div>
            <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">Invoice #${invoiceNumber} | Date: ${invoiceDate}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">FROM</div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 600; color: #000; margin-bottom: 5px;">SM Attorneys</div>
                <div style="color: #374151;">17 Nkupane Street</div>
                <div style="color: #374151;">Vosloorus</div>
                <div style="color: #374151;">Johannesburg, South Africa</div>
                <div style="color: #374151; margin-top: 8px;">Siyabonga.Makhubu@smattorneys.co.za</div>
              </div>
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">BILL TO</div>
              <div style="font-size: 14px; line-height: 1.6;">
                <div style="font-weight: 600; color: #000; margin-bottom: 5px;">${clientFilter || 'All Clients'}</div>
                <div style="color: #374151;">Invoice Date: ${invoiceDate}</div>
                <div style="color: #374151;">Due Date: ${dueDate}</div>
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">#</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">CLIENT / MATTER</th>
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">DESCRIPTION</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">HOURS</th>
                <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              ${entriesHTML}
            </tbody>
          </table>

          <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
            <div style="width: 300px;">
              <div style="display: flex; justify-content: space-between; padding: 12px 8px; border-top: 1px solid #e5e7eb;">
                <span style="color: #374151;">Subtotal</span>
                <span style="font-weight: 600; color: #000;">R${subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 8px; border-top: 1px solid #e5e7eb;">
                <span style="color: #374151;">VAT (15%)</span>
                <span style="font-weight: 600; color: #000;">R${vat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 8px; border-top: 2px solid #e5e7eb; background: #f9fafb;">
                <span style="font-weight: 600; color: #000;">TOTAL DUE</span>
                <span style="font-weight: 700; color: #000; font-size: 16px;">R${total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Thank you for your business. Payment terms: Net 30 days.</p>
          </div>
        </div>
      `;

      document.getElementById('invoiceContent').innerHTML = invoiceHTML;
      document.getElementById('invoiceModal').classList.add('active');
    }
    function printInvoice() {
      const printWindow = window.open('', '_blank');
      const invoiceContent = document.getElementById('invoiceContent').innerHTML;
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; }
            @page { margin: 0.5in; }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${invoiceContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }

    function downloadInvoicePDF() {
      const invoiceContent = document.getElementById('invoiceContent').innerHTML;
      const invoiceNumber = invoiceContent.match(/Invoice #([A-Z0-9-]+)/)?.[1] || 'Invoice';
      
      // Create a temporary container for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = invoiceContent;
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '210mm';
      tempContainer.style.height = 'auto';
      document.body.appendChild(tempContainer);
      
      // Use html2canvas and jsPDF to generate PDF
      const script1 = document.createElement('script');
      script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script2.onload = () => {
          const { jsPDF } = window.jspdf;
          
          html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          }).then(canvas => {
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeightPdf = pdf.internal.pageSize.getHeight();
            
            const imgData = canvas.toDataURL('image/png');
            
            while (heightLeft >= 0) {
              const height = Math.min(pageHeightPdf, heightLeft);
              pdf.addImage(imgData, 'PNG', 0, position > 0 ? -position : 0, pageWidth, imgHeight);
              heightLeft -= pageHeightPdf;
              position += pageHeightPdf;
              if (heightLeft > 0) pdf.addPage();
            }
            
            pdf.save(`${invoiceNumber}.pdf`);
            document.body.removeChild(tempContainer);
          });
        };
        document.head.appendChild(script2);
      };
      document.head.appendChild(script1);
    }

    let _categoryDonutChart = null;
    let _clientBarChart = null;
    let _hoursTrendChart = null;
    let _utilizationRadialChart = null;

    function updateInsights() {
      const approvedEntries = allEntries.filter(e => e.status === 'approved');
      if (approvedEntries.length === 0) {
        document.getElementById('categoryChart').innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Add entries to see breakdown</div>';
        document.getElementById('clientChart').innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">Add entries to see breakdown</div>';
        ['categoryDonut','clientBarChart','hoursTrendChart','utilizationRadial'].forEach(id => {
          document.getElementById(id).innerHTML = '<div class="text-center py-6 text-slate-500 text-sm">No data yet</div>';
        });
        updateMetrics([], []);
        return;
      }
      // ── existing bar charts ───────────────────────────────────────────────────
      const categoryMap = {};
      approvedEntries.forEach(e => { categoryMap[e.category] = (categoryMap[e.category] || 0) + e.durationHours; });
      const maxCat = Math.max(...Object.values(categoryMap));
      document.getElementById('categoryChart').innerHTML = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1]).map(([cat,hours])=>`
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">${cat}</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div style="width:${(hours/maxCat)*100}%;height:100%;background:linear-gradient(90deg,#0ea5e9,#06b6d4);" class="rounded-full"></div>
            </div>
            <span class="text-sm font-600 text-sky-400">${hours.toFixed(1)}h</span>
          </div>
        </div>`).join('');
      const clientMap = {};
      approvedEntries.forEach(e => { clientMap[e.client] = (clientMap[e.client] || 0) + e.durationHours; });
      const maxCli = Math.max(...Object.values(clientMap));
      document.getElementById('clientChart').innerHTML = Object.entries(clientMap).sort((a,b)=>b[1]-a[1]).map(([client,hours])=>`
        <div class="flex items-center justify-between">
          <span class="text-sm text-slate-400">${client}</span>
          <div class="flex items-center gap-2">
            <div class="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div style="width:${(hours/maxCli)*100}%;height:100%;background:linear-gradient(90deg,#34d399,#10b981);" class="rounded-full"></div>
            </div>
            <span class="text-sm font-600 text-emerald-400">${hours.toFixed(1)}h</span>
          </div>
        </div>`).join('');
      // ── ApexCharts ────────────────────────────────────────────────────────────
      const apexDefaults = {
        chart: { background: 'transparent', foreColor: '#94a3b8', toolbar: { show: false } },
        tooltip: { theme: 'dark' },
        grid: { borderColor: '#1e293b' }
      };
      // 1. Category Donut
      const catLabels = Object.keys(categoryMap);
      const catValues = catLabels.map(k => parseFloat(categoryMap[k].toFixed(2)));
      if (_categoryDonutChart) { _categoryDonutChart.destroy(); }
      _categoryDonutChart = new ApexCharts(document.getElementById('categoryDonut'), {
        ...apexDefaults,
        chart: { ...apexDefaults.chart, type: 'donut', height: 280 },
        series: catValues,
        labels: catLabels,
        colors: ['#38bdf8','#a78bfa','#34d399','#fbbf24','#f472b6','#fb923c'],
        legend: { position: 'bottom', labels: { colors: '#94a3b8' } },
        dataLabels: { style: { colors: ['#fff'] } },
        plotOptions: { pie: { donut: { size: '60%' } } }
      });
      _categoryDonutChart.render();
      // 2. Client Bar Chart
      const cliLabels = Object.keys(clientMap);
      const cliValues = cliLabels.map(k => parseFloat(clientMap[k].toFixed(2)));
      if (_clientBarChart) { _clientBarChart.destroy(); }
      _clientBarChart = new ApexCharts(document.getElementById('clientBarChart'), {
        ...apexDefaults,
        chart: { ...apexDefaults.chart, type: 'bar', height: 280 },
        series: [{ name: 'Hours', data: cliValues }],
        xaxis: { categories: cliLabels, labels: { style: { colors: '#94a3b8' } } },
        yaxis: { labels: { style: { colors: '#94a3b8' } } },
        colors: ['#34d399'],
        plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
        dataLabels: { enabled: false }
      });
      _clientBarChart.render();
      // 3. Hours Trend (last 7 days)
      const days = [];
      const dayHours = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' });
        const dStr = d.toDateString();
        const hrs = approvedEntries.filter(e => new Date(e.timestamp).toDateString() === dStr)
                                  .reduce((s, e) => s + e.durationHours, 0);
        days.push(label);
        dayHours.push(parseFloat(hrs.toFixed(2)));
      }
      if (_hoursTrendChart) { _hoursTrendChart.destroy(); }
      _hoursTrendChart = new ApexCharts(document.getElementById('hoursTrendChart'), {
        ...apexDefaults,
        chart: { ...apexDefaults.chart, type: 'area', height: 220 },
        series: [{ name: 'Hours', data: dayHours }],
        xaxis: { categories: days, labels: { style: { colors: '#94a3b8' } } },
        yaxis: { labels: { style: { colors: '#94a3b8' } } },
        colors: ['#38bdf8'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false }
      });
      _hoursTrendChart.render();
      // 4. Utilization Radial
      const today = new Date().toDateString();
      const todayHrs = approvedEntries.filter(e => new Date(e.timestamp).toDateString() === today)
                                      .reduce((s, e) => s + e.durationHours, 0);
      const utilPct = Math.min(100, Math.round((todayHrs / 8) * 100));
      if (_utilizationRadialChart) { _utilizationRadialChart.destroy(); }
      _utilizationRadialChart = new ApexCharts(document.getElementById('utilizationRadial'), {
        ...apexDefaults,
        chart: { ...apexDefaults.chart, type: 'radialBar', height: 280 },
        series: [utilPct],
        labels: ['Today'],
        colors: ['#a78bfa'],
        plotOptions: {
          radialBar: {
            hollow: { size: '60%' },
            dataLabels: {
              name: { color: '#94a3b8' },
              value: { color: '#fff', fontSize: '22px', fontWeight: 700, formatter: v => `${v}%` }
            },
            track: { background: '#1e293b' }
          }
        }
      });
      _utilizationRadialChart.render();

      updateMetrics(approvedEntries, allEntries);
    }

    function updateMetrics(approvedEntries, allEntries) {
      if (approvedEntries.length === 0) {
        document.getElementById('metricAvgEntry').textContent = '0m';
        document.getElementById('metricAutoRate').textContent = '0%';
        document.getElementById('metricBillable').textContent = '0%';
        document.getElementById('metricRecovery').textContent = '0m';
        return;
      }
      const avgDuration = (approvedEntries.reduce((sum, e) => sum + e.duration, 0) / approvedEntries.length).toFixed(0);
      const autoCount = approvedEntries.filter(e => e.source === 'auto').length;
      const autoRate = ((autoCount / approvedEntries.length) * 100).toFixed(0);
      const timeRecovered = (allEntries.filter(e => e.source === 'auto').length * 6).toFixed(0);
      document.getElementById('metricAvgEntry').textContent = `${avgDuration}m`;
      document.getElementById('metricAutoRate').textContent = `${autoRate}%`;
      document.getElementById('metricBillable').textContent = '100%';
      document.getElementById('metricRecovery').textContent = `${timeRecovered}m`;
    }

    function filterEntries(status) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelector(`[data-filter="${status}"]`).classList.add('active');
      let filtered = allEntries;
      if (status !== 'all') {
        filtered = allEntries.filter(e => e.status === status);
      }
      renderEntriesList(filtered);
    }

    function renderEntriesList(entries) {
      const entriesList = document.getElementById('entriesList');
      if (!entriesList) return;
      if (entries.length === 0) {
        entriesList.innerHTML = '<div class="text-center py-12 text-slate-500 text-sm">No time entries yet</div>';
        return;
      }
      entriesList.innerHTML = entries.map(entry => `
        <div class="entry-card" data-entry-id="${entry.id}">
          <div class="flex-1">
            <div class="entry-header">
              <span class="entry-client">${entry.client}</span>
              <span class="entry-matter">${entry.matter}</span>
            </div>
            <p class="text-sm text-slate-300">${entry.description}</p>
            <div class="entry-meta">
              <span class="entry-meta-item">
                <i data-lucide="clock" style="width:14px;height:14px;"></i>
                ${entry.durationHours.toFixed(2)}h
              </span>
              <span class="entry-meta-item">
                <i data-lucide="tag" style="width:14px;height:14px;"></i>
                ${entry.category}
              </span>
              <span class="entry-meta-item">
                <i data-lucide="zap" style="width:14px;height:14px;"></i>
                ${entry.source}
              </span>
              <span class="entry-meta-item">
                <i data-lucide="calendar" style="width:14px;height:14px;"></i>
                ${new Date(entry.timestamp).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div class="entry-actions">
            <div class="entry-status ${entry.status}">
              ${entry.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
            </div>
            <button class="entry-action-btn" onclick="toggleEntryStatus('${entry.id}')" title="Toggle Status">
              <i data-lucide="check-circle" style="width:16px;height:16px;"></i>
            </button>
            <button class="entry-action-btn" onclick="openDeleteModal('${entry.id}')" title="Delete">
              <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
            </button>
          </div>
        </div>
      `).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function navigateTo(page) {
      currentPage = page;
      document.querySelectorAll('[id^="page-"]').forEach(el => el.classList.add('hidden'));
      document.getElementById(`page-${page}`).classList.remove('hidden');
      document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      document.querySelector(`[data-page="${page}"]`).classList.add('active');
      updateUI();
    }

    function updateUI() {
      updateDashboard();
      updateEntriesUI();
      updateInsights();
      updateDetectionLog();
    }

    function updateDashboard() {
      const today = new Date().toDateString();
      const todayEntries = allEntries.filter(e => new Date(e.timestamp).toDateString() === today);
      const approvedToday = todayEntries.filter(e => e.status === 'approved');
      const totalHours = approvedToday.reduce((sum, e) => sum + e.durationHours, 0);
      const totalAmount = approvedToday.reduce((sum, e) => sum + e.amount, 0);
      const autoCount = todayEntries.filter(e => e.source === 'auto').length;
      const utilization = totalHours > 0 ? Math.min(100, Math.round((totalHours / 8) * 100)) : 0;
      document.getElementById('statHours').textContent = totalHours.toFixed(1);
      document.getElementById('statUnits').textContent = `${Math.ceil(totalHours * 10)} units`;
      document.getElementById('statAmount').textContent = `R ${totalAmount.toLocaleString()}`;
      document.getElementById('statEntries').textContent = todayEntries.length;
      document.getElementById('statAuto').textContent = autoCount;
      document.getElementById('statUtil').textContent = `${utilization}%`;
      const recentEntries = todayEntries.slice(-3).reverse();
      const recentHTML = recentEntries.length > 0 ? recentEntries.map(entry => `
        <div class="entry-card">
          <div>
            <div class="entry-header">
              <span class="entry-client">${entry.client}</span>
              <span class="entry-matter">${entry.matter}</span>
            </div>
            <p class="text-sm text-slate-300 mb-2">${entry.description}</p>
            <div class="flex items-center gap-4 text-xs">
              <span class="text-slate-500">${entry.durationHours}h</span>
              <span class="entry-status ${entry.status}">${entry.status === 'approved' ? '✓ Approved' : '⏳ Pending'}</span>
            </div>
          </div>
        </div>
      `).join('') : '<div class="text-center py-8 text-slate-500 text-sm">No entries yet. Start tracking or use Auto-Detect!</div>';

      document.getElementById('recentEntriesList').innerHTML = recentHTML;
    }
        // ── ROLE-BASED PERMISSIONS ────────────────────────────────────────────────
    let currentRole = localStorage.getItem('currentRole') || 'admin';
    let currentUserName = localStorage.getItem('currentUserName') || 'Siyabonga Makhubu';
    let pendingRole = null;
    const ADMIN_NAME = 'Siyabonga Makhubu';
    const rolePermissions = {
      admin:    { canApprove: true,  canDelete: true,  canAddClient: true,  canAddMatter: true,  canInvoice: true,  canViewReports: true,  canAutoDetect: true  },
      attorney: { canApprove: true,  canDelete: true,  canAddClient: false, canAddMatter: false, canInvoice: false, canViewReports: true,  canAutoDetect: true  },
      intern:   { canApprove: false, canDelete: false, canAddClient: false, canAddMatter: false, canInvoice: false, canViewReports: false, canAutoDetect: false }
    };

    function promptRoleSwitch(role) {
      if (role === currentRole) return;
      // Switching TO admin requires being Siyabonga
      pendingRole = role;
      document.getElementById('roleNameModalSubtitle').textContent =
        role === 'admin'
          ? 'Only Siyabonga Makhubu can switch to Admin. Enter your full name.'
          : `Enter your full name to sign in as ${role}.`;
      document.getElementById('roleNameInput').value = '';
      document.getElementById('roleNameModal').classList.add('active');
      setTimeout(() => document.getElementById('roleNameInput').focus(), 100);
    }

    function cancelRoleSwitch() {
      document.getElementById('roleNameModal').classList.remove('active');
      // Reset the dropdown to current role
      document.getElementById('roleSwitcher').value = currentRole;
      pendingRole = null;
    }

    function confirmRoleSwitch() {
      const name = document.getElementById('roleNameInput').value.trim();
      if (!name) { showToast('Please enter your name', 'error'); return; }

      // Switching to admin: must be Siyabonga
      if (pendingRole === 'admin' && name.toLowerCase() !== ADMIN_NAME.toLowerCase()) {
        showToast('Access denied. Admin is restricted to Siyabonga Makhubu.', 'error');
        document.getElementById('roleSwitcher').value = currentRole;
        document.getElementById('roleNameModal').classList.remove('active');
        pendingRole = null;
        return;
      }
      currentUserName = name;
      currentRole = pendingRole;
      localStorage.setItem('currentRole', currentRole);
      localStorage.setItem('currentUserName', currentUserName);
      // Update avatar initials
      const initials = name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
      document.getElementById('userAvatar').textContent = initials;
      document.getElementById('currentUserName').textContent = name;
      document.getElementById('roleNameModal').classList.remove('active');
      pendingRole = null;
      applyRolePermissions();
      showToast(`Signed in as ${name} (${currentRole})`, 'success');
    }

    function switchRole(role) {
      // kept for backward compat, now unused
    }

    function applyRolePermissions() {
      const p = rolePermissions[currentRole];
      document.getElementById('roleSwitcher').value = currentRole;
      document.getElementById('currentRoleLabel').textContent =
        currentRole === 'admin' ? 'Admin' : currentRole === 'attorney' ? 'Attorney' : 'Intern / Viewer';

      const addClientBtn = document.querySelector('[onclick="openClientModal()"]');
      const addMatterBtn = document.querySelector('[onclick="openMatterModal()"]');
      if (addClientBtn) addClientBtn.style.display = p.canAddClient ? '' : 'none';
      if (addMatterBtn) addMatterBtn.style.display = p.canAddMatter ? '' : 'none';

      const invoicesNav = document.querySelector('[data-page="invoices"]');
      if (invoicesNav) invoicesNav.style.display = p.canInvoice ? '' : 'none';

      const reportsNav = document.getElementById('nav-reports');
      if (reportsNav) reportsNav.style.display = p.canViewReports ? '' : 'none';

      const autoNav = document.querySelector('[data-page="autodetect"]');
      if (autoNav) autoNav.style.display = p.canAutoDetect ? '' : 'none';

      const exportBtns = document.getElementById('reportExportBtns');
      if (exportBtns) exportBtns.style.display = p.canInvoice ? '' : 'none';

      const restrictedPages = { invoices: !p.canInvoice, reports: !p.canViewReports, autodetect: !p.canAutoDetect };
      if (restrictedPages[currentPage]) navigateTo('dashboard');
    }
    // ── MONTHLY REPORT ────────────────────────────────────────────────────────
    function populateMonthSelector() {
      const sel = document.getElementById('reportMonthSelect');
      if (!sel) return;
      const months = new Set();
      allEntries.forEach(e => {
        const d = new Date(e.timestamp);
        months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      });
      // always include current month
      const now = new Date();
      months.add(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
      const sorted = [...months].sort().reverse();
      sel.innerHTML = sorted.map(m => {
        const [y, mo] = m.split('-');
        const label = new Date(y, mo-1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${label}</option>`;
      }).join('');
    }

    function renderMonthlyReport() {
      const sel = document.getElementById('reportMonthSelect');
      if (!sel) return;
      const [year, month] = sel.value.split('-').map(Number);
      const monthEntries = allEntries.filter(e => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === year && d.getMonth()+1 === month;
      });
      const approved = monthEntries.filter(e => e.status === 'approved');
      const totalHours = monthEntries.reduce((s,e) => s+e.durationHours, 0);
      const totalAmount = approved.reduce((s,e) => s+e.amount, 0);

      // Summary cards
      document.getElementById('reportSummaryCards').innerHTML = `
        <div class="bg-[#1a2332] border border-slate-700/40 rounded-2xl p-5">
          <div class="text-xs font-600 text-slate-500 uppercase mb-2">Total Entries</div>
          <div class="text-3xl font-bold text-white">${monthEntries.length}</div>
          <div class="text-xs text-slate-500 mt-1">${approved.length} approved</div>
        </div>
        <div class="bg-[#1a2332] border border-slate-700/40 rounded-2xl p-5">
          <div class="text-xs font-600 text-slate-500 uppercase mb-2">Total Hours</div>
          <div class="text-3xl font-bold text-sky-400">${totalHours.toFixed(1)}h</div>
          <div class="text-xs text-slate-500 mt-1">${Math.ceil(totalHours*10)} units</div>
        </div>
        <div class="bg-[#1a2332] border border-slate-700/40 rounded-2xl p-5">
          <div class="text-xs font-600 text-slate-500 uppercase mb-2">Billable Amount</div>
          <div class="text-3xl font-bold text-emerald-400">R ${totalAmount.toLocaleString()}</div>
          <div class="text-xs text-slate-500 mt-1">Approved entries only</div>
        </div>
      `;
      // Table
      if (!monthEntries.length) {
        document.getElementById('reportTableBody').innerHTML =
          '<tr><td colspan="8" class="text-center py-8 text-slate-500">No entries for this month</td></tr>';
        return;
      }
      document.getElementById('reportTableBody').innerHTML = monthEntries
        .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
        .map(e => `
          <tr class="border-b border-slate-700/30 hover:bg-slate-800/30 transition">
            <td class="py-3 pr-4 text-slate-400 text-xs">${new Date(e.timestamp).toLocaleDateString('en-ZA')}</td>
            <td class="py-3 pr-4 text-white text-xs font-500">${escHtml(e.client)}</td>
            <td class="py-3 pr-4 text-slate-400 text-xs">${escHtml(e.matter)}</td>
            <td class="py-3 pr-4 text-slate-400 text-xs">${escHtml(e.category)}</td>
            <td class="py-3 pr-4 text-slate-300 text-xs">${escHtml(e.description)}</td>
            <td class="py-3 pr-4 text-sky-400 text-xs text-right font-600">${e.durationHours.toFixed(2)}</td>
            <td class="py-3 pr-4 text-emerald-400 text-xs text-right font-600">R ${e.amount.toLocaleString()}</td>
            <td class="py-3 text-center"><span class="text-[10px] px-2 py-0.5 rounded-full ${e.status==='approved'?'bg-emerald-500/15 text-emerald-400':'bg-slate-700/60 text-slate-400'}">${e.status}</span></td>
          </tr>
        `).join('');
    }
    // ── EXPORT EXCEL ──────────────────────────────────────────────────────────
    function exportReportExcel() {
      const sel = document.getElementById('reportMonthSelect');
      const [year, month] = sel.value.split('-').map(Number);
      const monthEntries = allEntries.filter(e => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === year && d.getMonth()+1 === month;
      });
      if (!monthEntries.length) { showToast('No entries to export', 'error'); return; }

      const rows = [
        ['Date','Client','Matter','Category','Description','Hours','Amount (R)','Status'],
        ...monthEntries.map(e => [
          new Date(e.timestamp).toLocaleDateString('en-ZA'),
          e.client, e.matter, e.category, e.description,
          e.durationHours, e.amount, e.status
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Report');
      XLSX.writeFile(wb, `Report-${sel.value}.xlsx`);
      showToast('Excel exported!', 'success');
    }
    // ── EXPORT PDF ────────────────────────────────────────────────────────────
    function exportReportPDF() {
      const sel = document.getElementById('reportMonthSelect');
      const [year, month] = sel.value.split('-').map(Number);
      const label = new Date(year, month-1, 1).toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
      const monthEntries = allEntries.filter(e => {
        const d = new Date(e.timestamp);
        return d.getFullYear() === year && d.getMonth()+1 === month;
      });
      if (!monthEntries.length) { showToast('No entries to export', 'error'); return; }
      const totalHours = monthEntries.reduce((s,e) => s+e.durationHours, 0);
      const totalAmount = monthEntries.filter(e=>e.status==='approved').reduce((s,e) => s+e.amount, 0);

      const html = `
        <!DOCTYPE html><html><head><meta charset="UTF-8">
        <style>
          body{font-family:sans-serif;color:#1f2937;padding:30px;}
          h1{font-size:22px;margin-bottom:4px;}p{color:#6b7280;font-size:13px;}
          .summary{display:flex;gap:20px;margin:20px 0;}
          .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 20px;min-width:140px;}
          .card .label{font-size:11px;color:#6b7280;text-transform:uppercase;}
          .card .val{font-size:20px;font-weight:700;color:#111;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th{background:#f3f4f6;text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;}
          td{padding:8px;border-bottom:1px solid #e5e7eb;}
          .badge{padding:2px 8px;border-radius:99px;font-size:10px;}
          .approved{background:#d1fae5;color:#065f46;}.pending{background:#f3f4f6;color:#6b7280;}
          @media print{body{padding:0;}}
        </style></head><body>
        <h1>Monthly Report — ${label}</h1>
        <p>MB Attorneys · Generated ${new Date().toLocaleDateString('en-ZA')}</p>
        <div class="summary">
          <div class="card"><div class="label">Entries</div><div class="val">${monthEntries.length}</div></div>
          <div class="card"><div class="label">Total Hours</div><div class="val">${totalHours.toFixed(1)}h</div></div>
          <div class="card"><div class="label">Billable (Approved)</div><div class="val">R ${totalAmount.toLocaleString()}</div></div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Client</th><th>Matter</th><th>Category</th><th>Description</th><th>Hours</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${monthEntries.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).map(e=>`
              <tr>
                <td>${new Date(e.timestamp).toLocaleDateString('en-ZA')}</td>
                <td>${e.client}</td><td>${e.matter}</td><td>${e.category}</td>
                <td>${e.description}</td>
                <td>${e.durationHours.toFixed(2)}</td>
                <td>R ${e.amount.toLocaleString()}</td>
                <td><span class="badge ${e.status}">${e.status}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        </body></html>`;

      const win = window.open('','_blank');
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
      showToast('PDF ready to print/save', 'success');
    }
    function updateEntriesUI() {
      const activeTab = document.querySelector('.tab-btn.active')?.dataset.filter || 'all';
      filterEntries(activeTab);
    }

    function openDeleteModal(entryId) {
      deleteTargetId = entryId;
      document.getElementById('deleteModal').classList.add('active');
    }

    function closeDeleteModal() {
      deleteTargetId = null;
      document.getElementById('deleteModal').classList.remove('active');
    }

    function closeInvoiceModal() {
      document.getElementById('invoiceModal').classList.remove('active');
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      const iconMap = {
        success: 'check-circle',
        error: 'alert-circle',
        info: 'info'
      };
      
      toast.innerHTML = `
        <i data-lucide="${iconMap[type]}" style="width:16px;height:16px;flex-shrink:0;"></i>
        <span>${message}</span>
      `;
      container.appendChild(toast);

      if (typeof lucide !== 'undefined') lucide.createIcons();

      setTimeout(() => {
        toast.style.animation = 'slide-in-toast 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    // TRUST ACCOUNTING

function openTrustTransactionModal() {
  document.getElementById("trustTransactionModal").classList.add("active");
}

function closeTrustTransactionModal() {
  document.getElementById("trustTransactionModal").classList.remove("active");
}

function saveTrustTransaction() {

  const client = document.getElementById("trustClient").value;
  const type = document.getElementById("trustType").value;
  const amount = document.getElementById("trustAmount").value;
  const reference = document.getElementById("trustReference").value;

  if (!amount || !reference) {
    alert("Please complete all fields");
    return;
  }

  const table = document.getElementById("trustLedgerTable");

  const row = document.createElement("tr");
  row.className = "border-b border-slate-800";

  const isDeposit = type === "deposit";

  row.innerHTML = `
    <td class="py-4 pr-4 text-slate-300">
      ${new Date().toLocaleDateString()}
    </td>

    <td class="py-4 pr-4 text-white">
      ${client}
    </td>

    <td class="py-4 pr-4 text-slate-400">
      ${reference}
    </td>

    <td class="py-4 pr-4">
      <span class="px-2 py-1 rounded-lg ${isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'} text-xs">
        ${isDeposit ? 'Deposit' : 'Withdrawal'}
      </span>
    </td>

    <td class="py-4 pr-4 text-right ${isDeposit ? 'text-emerald-400' : 'text-red-400'}">
      ${isDeposit ? '+' : '-'}R ${Number(amount).toLocaleString()}
    </td>

    <td class="py-4 pr-4 text-right text-white">
      R ${Number(amount).toLocaleString()}
    </td>

    <td class="py-4 text-center">
      <span class="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-xs">
        Cleared
      </span>
    </td>
  `;

  table.prepend(row);

  closeTrustTransactionModal();

  document.getElementById("trustAmount").value = "";
  document.getElementById("trustReference").value = "";

  lucide.createIcons();
}

// ===============================
// TRUST ACCOUNTING
// ===============================

let trustTransactions = [
  {
    date: "2026-05-13",
    client: "Maponya Holdings Pty Ltd",
    reference: "Maponya-Holdings-Legacy",
    type: "deposit",
    amount: 40000,
    status: "Cleared"
  },

  {
    date: "2026-05-13",
    client: "Ackermans Corp",
    reference: "TRUST-001",
    type: "deposit",
    amount: 15000,
    status: "Cleared"
  },

  {
    date: "2026-05-14",
    client: "2Canna Ltd",
    reference: "TRUST-002",
    type: "withdrawal",
    amount: 5500,
    status: "Pending"
  }
];


// ===============================
// OPEN / CLOSE MODAL
// ===============================

function openTrustTransactionModal() {
  document.getElementById("trustTransactionModal").classList.add("active");
}

function closeTrustTransactionModal() {
  document.getElementById("trustTransactionModal").classList.remove("active");
}


// ===============================
// SAVE TRANSACTION
// ===============================

function saveTrustTransaction() {

  const client = document.getElementById("trustClient").value;
  const type = document.getElementById("trustType").value;
  const amount = Number(document.getElementById("trustAmount").value);
  const reference = document.getElementById("trustReference").value;

  if (!client || !amount || !reference) {
    showToast("Please complete all fields", "error");
    return;
  }

  trustTransactions.unshift({
    date: new Date().toISOString().split("T")[0],
    client,
    reference,
    type,
    amount,
    status: "Cleared"
  });

  renderTrustLedger();
  updateTrustSummary();

  closeTrustTransactionModal();

  document.getElementById("trustAmount").value = "";
  document.getElementById("trustReference").value = "";

  showToast("Trust transaction added", "success");
}


// ===============================
// RENDER LEDGER
// ===============================

function renderTrustLedger() {

  const table = document.getElementById("trustLedgerTable");

  if (!table) return;

  table.innerHTML = "";

  let runningBalance = 0;

  trustTransactions.forEach(transaction => {

    if (transaction.type === "deposit") {
      runningBalance += transaction.amount;
    } else {
      runningBalance -= transaction.amount;
    }

    const row = document.createElement("tr");

    row.className = "border-b border-slate-800";

    row.innerHTML = `

      <td class="py-4 pr-4 text-slate-300">
        ${formatTrustDate(transaction.date)}
      </td>

      <td class="py-4 pr-4 text-white">
        ${transaction.client}
      </td>

      <td class="py-4 pr-4 text-slate-400">
        ${transaction.reference}
      </td>

      <td class="py-4 pr-4">
        <span class="px-2 py-1 rounded-lg text-xs
          ${transaction.type === 'deposit'
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-red-500/10 text-red-400'}">

          ${transaction.type === 'deposit'
            ? 'Deposit'
            : 'Withdrawal'}

        </span>
      </td>

      <td class="py-4 pr-4 text-right
        ${transaction.type === 'deposit'
          ? 'text-emerald-400'
          : 'text-red-400'}">

        ${transaction.type === 'deposit' ? '+' : '-'}
        R ${transaction.amount.toLocaleString()}

      </td>

      <td class="py-4 pr-4 text-right text-white">
        R ${runningBalance.toLocaleString()}
      </td>

      <td class="py-4 text-center">
        <span class="px-2 py-1 rounded-lg text-xs
          ${transaction.status === 'Cleared'
            ? 'bg-sky-500/10 text-sky-400'
            : 'bg-amber-500/10 text-amber-400'}">

          ${transaction.status}

        </span>
      </td>
    `;

    table.appendChild(row);
  });

  lucide.createIcons();
}


// ===============================
// UPDATE SUMMARY CARDS
// ===============================

function updateTrustSummary() {

  let totalBalance = 0;
  let deposits = 0;
  let withdrawals = 0;

  trustTransactions.forEach(transaction => {

    if (transaction.type === "deposit") {
      deposits += transaction.amount;
      totalBalance += transaction.amount;
    } else {
      withdrawals += transaction.amount;
      totalBalance -= transaction.amount;
    }
  });

  document.getElementById("trustTotalBalance").textContent =
    `R ${totalBalance.toLocaleString()}`;

  document.getElementById("trustDeposits").textContent =
    `R ${deposits.toLocaleString()}`;

  document.getElementById("trustWithdrawals").textContent =
    `R ${withdrawals.toLocaleString()}`;
}


// ===============================
// DATE FORMAT
// ===============================

function formatTrustDate(dateString) {

  const date = new Date(dateString);

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


// ===============================
// SEARCH FILTER
// ===============================

document.addEventListener("input", function(e) {

  if (e.target.id === "trustSearch") {

    const value = e.target.value.toLowerCase();

    document.querySelectorAll("#trustLedgerTable tr").forEach(row => {

      row.style.display =
        row.innerText.toLowerCase().includes(value)
          ? ""
          : "none";
    });
  }
});


// ===============================
// INITIALIZE TRUST PAGE
// ===============================

renderTrustLedger();
updateTrustSummary();



    (function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9f6f517c1400f4f0',t:'MTc3Nzk3OTYzMi4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();
