<script>
/* ============================================================
   STATE & STORAGE
============================================================ */
const SK = 'noki_v3';
const SK_CONFIGURED = 'noki_configured';

// ===================== SÉCURITÉ NK =====================
const NK_DOMAIN = window.location.hostname; // Domaine actuel
const NK_ALLOWED_DOMAINS = ['localhost', '127.0.0.1', 'nokimet.netlify.app', 'nokimetrics.com', 'www.nokimetrics.com'];
// Vérifier si le domaine est autorisé
function isDomainAuthorized() {
  const hostname = window.location.hostname;
  return NK_ALLOWED_DOMAINS.some(domain => 
    hostname === domain || hostname.endsWith('.' + domain)
  );
}

// Vérifier la signature d'intégrité
function generateIntegrityHash() {
  const deviceId = localStorage.getItem('noki_device_id') || 'NK-0000';
  const activated = localStorage.getItem('noki_activated') || 'false';
  return btoa(deviceId + ':' + activated + ':noki-secure');
}

function verifyIntegrity() {
  const storedHash = localStorage.getItem('noki_integrity');
  const currentHash = generateIntegrityHash();
  
  if (!storedHash) {
    // Premier lancement, enregistrer le hash d'intégrité
    localStorage.setItem('noki_integrity', currentHash);
    return true;
  }
  
  // Vérifier que les données critiques n'ont pas été modifiées
  return storedHash === currentHash;
}

// Protection contre l'ouverture en iframe (anti-vol)
function detectIframeEmbed() {
  if (window.self !== window.top) {
    // Noki est chargé dans une iframe — bloquer
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:#0B0F1A;display:flex;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif">
        <div style="text-align:center;color:#fff;padding:40px">
          <div style="font-size:64px;margin-bottom:20px">🚫</div>
          <h1 style="font-size:24px;margin-bottom:10px">Accès Interdit</h1>
          <p style="color:#8e90a1;font-size:14px">NokiMetrics ne peut pas être chargé depuis un autre site.<br>Veuillez accéder directement à l'application.</p>
          <button onclick="window.top.location='about:blank'" style="margin-top:20px;padding:12px 24px;background:#2755e6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700">Fermer</button>
        </div>
      </div>
    `;
    document.head.innerHTML = '<title>Accès Refusé</title>';
    throw new Error('NokiMetrics - Chargement en iframe détecté et bloqué');
  }
}

// Protection anti-développeur (console warning)
(function() {
  const warningMsg = '%c⚠️ ATTENTION %c\nNokiMetrics est protégé par Lindark Ecosystem.\nToute tentative de copie, modification ou extraction du code est interdite.\nCe produit est sous licence exclusive.\n\nContact : +243 838 880 629';
  console.log(
    warningMsg,
    'color: #ffb4ab; font-size: 20px; font-weight: bold;',
    'color: #8e90a1; font-size: 13px;'
  );
  
  // Détection d'ouverture répétée des DevTools (anti-débug)
  let devtoolsOpen = false;
  const threshold = 160;
  
  setInterval(() => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        console.clear();
        console.log('%c🔒 Mode sécurisé actif', 'color: #2755e6; font-size: 16px; font-weight: bold');
      }
    } else {
      devtoolsOpen = false;
    }
  }, 1000);
})();

// Protection contre le clic droit (sauf sur les inputs)
document.addEventListener('contextmenu', function(e) {
  const target = e.target;
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.tagName === 'SELECT' ||
                  target.isContentEditable;
  
  if (!isInput) {
    e.preventDefault();
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = '';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
    return false;
  }
});

// Protection anti-copie (Ctrl+C, Ctrl+S, Ctrl+U, F12)
document.addEventListener('keydown', function(e) {
  const target = e.target;
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.tagName === 'SELECT' ||
                  target.isContentEditable;
  
  // Bloquer Ctrl+U (voir source), Ctrl+S (sauvegarder), F12 (devtools)
  if (!isInput) {
    if ((e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'U' || e.key === 'S')) || 
        e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  }
  
  // Bloquer Ctrl+Shift+I (devtools)
  if (e.ctrlKey && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
    e.preventDefault();
    return false;
  }
});

// Exécuter les vérifications de sécurité au démarrage
function initializeSecurity() {
  // Vérifier l'iframe
  detectIframeEmbed();
  
  // Vérifier l'intégrité
  if (!verifyIntegrity()) {
    console.error('⚠️ Alerte d\'intégrité NokiMetrics');
    localStorage.setItem('noki_activated', 'false');
    localStorage.setItem('noki_integrity', generateIntegrityHash());
    location.reload();
  }
}

// ===================== DÉTECTION LOCAL STORAGE =====================
function checkLocalStorage() {
  try {
    const testKey = '__noki_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function showLocalStorageWarning() {
  const warning = document.getElementById('localStorageWarning');
  if (warning) {
    warning.classList.add('show');
    document.body.classList.add('ls-warning-active');
  }
}

// Vérification immédiate
if (!checkLocalStorage()) {
  showLocalStorageWarning();
  console.error('❌ localStorage désactivé - Les données ne seront pas sauvegardées');
}
// ===================== ACTIVATION SYSTEM =====================
function generateDeviceId() {
  const stored = localStorage.getItem('noki_device_id');
  if (stored) return stored;
  const num = Math.floor(1000 + Math.random() * 9000);
  const id = 'NK-' + num;
  localStorage.setItem('noki_device_id', id);
  return id;
}

function computeActivationKey(deviceId) {
  const num = parseInt(deviceId.split('-')[1]);
  if (isNaN(num)) return null;
  // Formule secrète : (num * 2) + 2026
  const result = (num * 2) + 2026;
  return 'NK-' + result + '-RDC';
}

function isActivated() {
  return localStorage.getItem('noki_activated') === 'true';
}

function activateApp(key) {
  const deviceId = generateDeviceId();
  const expectedKey = computeActivationKey(deviceId);
  if (key === expectedKey) {
    localStorage.setItem('noki_activated', 'true');
    // Mettre à jour le hash d'intégrité IMMÉDIATEMENT pour éviter le reset au prochain refresh
    localStorage.setItem('noki_integrity', generateIntegrityHash());
    return true;
  }
  return false;
}

function showActivationScreen() {
  const deviceId = generateDeviceId();
  // Cacher tout, afficher l'activation
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('activationScreen').style.display = 'flex';
  document.getElementById('actDeviceId').textContent = deviceId;
  
  document.getElementById('actWhatsappBtn').onclick = function() {
    const message = encodeURIComponent('Bonjour Lindark, je souhaite activer Noki. Mon ID est : ' + deviceId);
    window.open('https://wa.me/243838880629?text=' + message, '_blank');
  };
  
if (activateApp(key)) {
  // Activation réussie - marquer comme activé
  localStorage.setItem('noki_activated', 'true');
  
  // NE PAS effacer les données existantes
  // Si l'utilisateur avait déjà des données, elles restent intactes
  
  // Vérifier si déjà configuré
  const isConfigured = localStorage.getItem(SK_CONFIGURED) === 'true';
  
  if (!isConfigured) {
    // Première configuration
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('activationScreen').style.display = 'none';
    showToast('✅ Application activée ! Veuillez configurer votre espace');
  } else {
    // Déjà configuré, retour au dashboard
    document.getElementById('activationScreen').style.display = 'none';
    enterApp();
    showToast('✅ Application activée avec succès');
  }
  
  // Nettoyer les champs
  document.getElementById('actError').textContent = '';
  document.getElementById('actKeyInput').value = '';
  
} else {
  document.getElementById('actError').textContent = '❌ Clé invalide. Vérifiez et réessayez.';
  const input = document.getElementById('actKeyInput');
  input.style.borderColor = 'var(--red)';
  input.style.animation = 'shake 0.4s ease';
  setTimeout(() => { 
    input.style.borderColor = ''; 
    input.style.animation = ''; 
  }, 1200);
}
  
  document.getElementById('actKeyInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('actValidateBtn').click();
    }
  });
}
let state = {
  entries: [],
  currency: 'FCFA',
  brand: 'NokiMetrics',
  logo: null,
  alertDelivery: 50,
  alertRoi: 0,
  filters: { campaign: '', dateFrom: '', dateTo: '' },
  secondaryCurrency: '',
  exchangeRate: 0,
  theme: 'dark',
  ceoPIN: '0000'
};
let profitChart = null, costChart = null, deliveryChart = null;

async function loadState() {
  try {
    // Charger les préférences UI depuis localStorage
    const raw = localStorage.getItem(SK);
    if (raw) {
      const uiPrefs = JSON.parse(raw);
      state = { ...state, ...uiPrefs };
    }
    
    // Charger les données critiques depuis IndexedDB
    if (window.getAllEntriesDB) {
      state.entries = await getAllEntriesDB();
    }
    
    if (window.getAllFixedChargesDB) {
      state.fixedCharges = await getAllFixedChargesDB();
    }
    
    if (window.getAllProductsDB && window.getAllMovementsDB) {
      const products = await getAllProductsDB();
      const movements = await getAllMovementsDB();
      state.stock = { products, movements };
    }
    
  } catch(e) {
    console.error('Erreur loadState:', e);
  }
}
async function saveState() {
  if (!checkLocalStorage()) {
    showLocalStorageWarning();
    return;
  }
  try { 
    // Sauvegarde locale pour les préférences UI
const uiState = {
  currency: state.currency,
  brand: state.brand,
  logo: state.logo,
  alertDelivery: state.alertDelivery,
  alertRoi: state.alertRoi,
  filters: state.filters,
  secondaryCurrency: state.secondaryCurrency,
  exchangeRate: state.exchangeRate,
  theme: state.theme,
  ceoPIN: state.ceoPIN
};
    localStorage.setItem(SK, JSON.stringify(uiState));
    
    // Sauvegarde des données critiques dans IndexedDB
    if (window.saveEntryDB && state.entries) {
      // Sauvegarde incrémentale des entrées
      for (const entry of state.entries) {
        await saveEntryDB(entry);
      }
    }
    
    if (window.saveFixedChargesDB && state.fixedCharges) {
      await saveFixedChargesDB(state.fixedCharges);
    }
    
    // Mettre à jour le hash d'intégrité
    localStorage.setItem('noki_integrity', generateIntegrityHash());
    markDataStale();
    lastSyncTimestamp = new Date();
  } catch(e) {
    console.error('Erreur saveState:', e);
    showLocalStorageWarning();
  }
}

function computeEntry(e) {
  // ===================== ÉTAPE 1 : CONVERSION UNIFORMISÉE =====================
  const rate = state.secondaryCurrency && state.exchangeRate ? state.exchangeRate : 0;
  const conv = (val, currency) => (currency === 'secondary' && rate > 0) ? val / rate : val;
  
  // Conversion TOUS les champs monétaires
  const sellConverted      = conv(+e.sell    || 0, e.sellCurrency);
  const buyConverted       = conv(+e.buy     || 0, e.buyCurrency);
  const spendConverted     = conv(+e.spend   || 0, e.spendCurrency);
  const shipTotalConverted = conv(+e.ship    || 0, e.shipCurrency);
  const callTotalConverted = conv(+e.call    || 0, e.callCurrency);
  const otherTotalConverted= conv(+e.other   || 0, e.otherCurrency);
  
  // Données non-monétaires
  const orders    = +e.orders  || 0;
  const delivered = +e.delivered || 0;
  const returns   = +e.returns || 0;
  
  // ===================== ÉTAPE 2 : CALCULS =====================
  const effectiveDelivered = Math.max(0, delivered - returns);
  
  // Revenu total
  const revenue = effectiveDelivered * sellConverted;
  
  // Coût des marchandises vendues
  const cogsBuy = orders * buyConverted;
  
  // Coût total (TOUT en devise principale)
  const totalCost = cogsBuy + spendConverted + shipTotalConverted + callTotalConverted + otherTotalConverted;
  
  // Bénéfice net
  const netProfit = revenue - totalCost;
  
  // Taux de livraison
  const deliveryRate = orders > 0 ? (effectiveDelivered / orders) * 100 : 0;
  
  // CPA (utilise spendConverté, PAS e.spend)
  const cpaReal = orders > 0 ? spendConverted / orders : 0;
  const cpaRealDelivered = effectiveDelivered > 0 ? spendConverted / effectiveDelivered : 0;
  
  // Frais de livraison par commande
  const shipUnit = orders > 0 ? shipTotalConverted / orders : 0;
  
  // Marge brute
  const grossMargin = sellConverted - buyConverted - shipUnit;
  
  // CPA Break-even
  const breakEvenCpa = grossMargin * (deliveryRate / 100);
  
  // ROI
  const roiPercent = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  
  // Marge nette par colis livré
  const marginPerDelivered = effectiveDelivered > 0 ? netProfit / effectiveDelivered : 0;

  // ===================== ÉTAPE 3 : RETOUR (ÉCRASE LES VALEURS BRUTES) =====================
  return { 
    ...e, 
    // ⚠️ CRITIQUE : ces champs ÉCRASENT les valeurs brutes d'origine
    // Maintenant le dashboard utilisera les valeurs CONVERTIES
    spend: spendConverted,           // ← ÉCRASE e.spend (brut) par la valeur convertie
    buy: buyConverted,               // ← ÉCRASE e.buy (brut)
    sell: sellConverted,             // ← ÉCRASE e.sell (brut)
    ship: shipTotalConverted,        // ← ÉCRASE e.ship (brut)
    call: callTotalConverted,        // ← ÉCRASE e.call (brut)
    other: otherTotalConverted,      // ← ÉCRASE e.other (brut)
    
    // Grandeurs calculées
    revenue, 
    totalCost, 
    netProfit, 
    deliveryRate, 
    cpaReal,           // ← CORRECT : basé sur spendConverted
    cpaRealDelivered,  // ← CORRECT : basé sur spendConverted
    breakEvenCpa, 
    roiPercent, 
    grossMargin, 
    marginPerDelivered, 
    effectiveDelivered, 
    shipUnit
  };
}

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  // Si le nombre est >= 100, on arrondit à l'entier. Sinon on garde 1 décimale.
  const rounded = Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
  return rounded.toLocaleString('fr-FR') + ' ' + state.currency;
}
function fmtPct(n) { return isNaN(n) ? '—' : Math.round(n) + '%'; }
function fmtNum(n) { return Math.round(n).toLocaleString('fr-FR'); }

document.getElementById('ob_enter').addEventListener('click', () => {
  const brand = document.getElementById('ob_brand').value.trim();
  const currency = document.getElementById('ob_currency').value;
  
  if (!brand) {
    showToast('Veuillez entrer le nom de votre boutique');
    return;
  }
  
  // Sauvegarder la configuration
  state.brand = brand;
  state.currency = currency;
  saveState();
  
  // Marquer comme configuré
  localStorage.setItem(SK_CONFIGURED, 'true');
  
  // Appliquer la devise
  setCurrency(currency, true);
  
  // Entrer dans l'application
  enterApp();
});
// Auto-enter si l'utilisateur a déjà configuré l'app
// (supprimé pour éviter le conflit avec Live Server)
function enterApp() {
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.add('visible');
  applySettings();
  updateDashboard();
  runSim();
  updateAnalytics();
  applyTheme();
      if (!state.ceoPIN) state.ceoPIN = '0000';
  // Démarrer la bannière partenaire
  schedulePartnerBanner();
}
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel_' + name).classList.add('active');
  const btn = document.getElementById('nav_' + name);
  if (btn) btn.classList.add('active');
  const bbtn = document.getElementById('bnav_' + name);
  if (bbtn) bbtn.classList.add('active');
  if (name === 'analytics') updateAnalytics();
  if (name === 'simulator') runSim();
  if (name === 'entry') populateStockDropdown();
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('mobileOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
}
// ===================== EXPORT PDF =====================
let exportPeriod = 'today';
let customDateFrom = '';
let customDateTo = '';

let whatsappPeriod = 'today';
let whatsappCustomFrom = '';
let whatsappCustomTo = '';

function openExportModal() {
  document.getElementById('exportModalOverlay').classList.add('open');
  document.getElementById('customDateRow').style.display = exportPeriod === 'custom' ? 'flex' : 'none';
}

function closeExportModal() {
  document.getElementById('exportModalOverlay').classList.remove('open');
}

function selectExportPeriod(period) {
  exportPeriod = period;
  document.querySelectorAll('.export-option').forEach(o => o.classList.remove('selected'));
  document.getElementById('exportOpt_' + period).classList.add('selected');
  document.getElementById('customDateRow').style.display = period === 'custom' ? 'flex' : 'none';
}

function updateCustomExport() {
  customDateFrom = document.getElementById('exportDateFrom').value;
  customDateTo = document.getElementById('exportDateTo').value;
}

function getExportEntries() {
  const now = new Date();
  let from, to;
  
  switch(exportPeriod) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      const y = new Date(now); y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
      break;
    case '7days':
      from = new Date(now); from.setDate(from.getDate() - 7);
      to = now;
      break;
    case '30days':
      from = new Date(now); from.setDate(from.getDate() - 30);
      to = now;
      break;
    case 'custom':
      from = customDateFrom ? new Date(customDateFrom) : new Date(0);
      to = customDateTo ? new Date(customDateTo + 'T23:59:59') : now;
      break;
  }
  
  return state.entries.filter(e => {
    const d = new Date(e.dateISO);
    return d >= from && d <= to;
  }).map(computeEntry);
}

function generatePDF() {
  const entries = getExportEntries();
  const charges = getFixedCharges ? getFixedCharges() : [];
  const totalFixes = charges.reduce((s, c) => s + (+c.amount || 0), 0);
  
  const agg = entries.reduce((a, e) => {
    a.net += e.netProfit;
    a.del += e.effectiveDelivered;
    a.orders += +e.orders || 0;
    a.rev += e.revenue;
    a.cost += e.totalCost;
    a.spend += e.spend;
    return a;
  }, { net: 0, del: 0, orders: 0, rev: 0, cost: 0, spend: 0 });
  
  const avgDelivery = agg.orders > 0 ? Math.round((agg.del / agg.orders) * 100) : 0;
  const roi = agg.cost > 0 ? Math.round((agg.net / agg.cost) * 100) : 0;
  const avgCpa = agg.orders > 0 ? Math.round(agg.spend / agg.orders) : 0;
  
  const periodLabel = {
    today: "Aujourd'hui",
    yesterday: "Hier",
    '7days': "7 derniers jours",
    '30days': "30 derniers jours",
    custom: `${customDateFrom || '...'} → ${customDateTo || '...'}`
  }[exportPeriod];
  
  const brand = state.brand || 'NokiMetrics';
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="UTF-8"><title>Rapport ${brand} - ${periodLabel}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:30px;color:#1a1a2e;line-height:1.5;font-size:13px}
      .header{text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:3px solid #2755e6}
      .header h1{font-size:24px;color:#2755e6;margin-bottom:4px}
      .header .date{color:#6b7280;font-size:12px}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .kpi-card{background:#f5f6fa;border-radius:12px;padding:14px 16px;text-align:center}
      .kpi-label{font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
      .kpi-value{font-size:22px;font-weight:800;color:#1a1a2e;margin-top:4px}
      .section{margin-bottom:20px}
      .section-title{font-size:15px;font-weight:700;color:#2755e6;margin-bottom:10px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#2755e6;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase}
      td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:12px}
      tr:nth-child(even){background:#f9fafb}
      .profit-pos{color:#059669;font-weight:700}
      .profit-neg{color:#dc2626;font-weight:700}
      .footer{text-align:center;margin-top:30px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af}
      .ceo-section{background:#f0f4ff;border-radius:12px;padding:16px;margin-bottom:16px}
      .charge-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #dbeafe}
      .charge-total{font-weight:700;font-size:14px;margin-top:8px;text-align:right;color:#2755e6}
    </style></head><body>
    <div class="header">
      <h1>📊 Rapport NokiMetrics — ${brand}</h1>
      <div class="date">${periodLabel} • Généré le ${dateStr}</div>
    </div>
    
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Bénéfice Net</div><div class="kpi-value" style="color:${agg.net>=0?'#059669':'#dc2626'}">${fmt(agg.net)}</div></div>
      <div class="kpi-card"><div class="kpi-label">Taux Livraison</div><div class="kpi-value">${avgDelivery}%</div></div>
      <div class="kpi-card"><div class="kpi-label">CPA Moyen</div><div class="kpi-value">${fmt(avgCpa)}</div></div>
      <div class="kpi-card"><div class="kpi-label">ROI</div><div class="kpi-value" style="color:${roi>=0?'#059669':'#dc2626'}">${roi}%</div></div>
    </div>
    
    ${charges.length > 0 ? `
    <div class="ceo-section">
      <div class="section-title">💰 Charges Fixes Mensuelles</div>
      ${charges.map(c => `<div class="charge-row"><span>${c.label}</span><span>${fmt(c.amount)}</span></div>`).join('')}
      <div class="charge-total">Total Charges Fixes : ${fmt(totalFixes)}</div>
      <div style="margin-top:8px;font-weight:600;color:${(agg.net-totalFixes)>=0?'#059669':'#dc2626'}">
        Bénéfice Net Réel (après charges) : ${fmt(agg.net - totalFixes)}
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">📋 Détail des saisies (${entries.length})</div>
      <table>
        <thead><tr><th>Date</th><th>Campagne</th><th>Cmd</th><th>Livrés</th><th>Taux</th><th>Bénéfice</th></tr></thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td>${e.dateISO || ''}</td>
              <td>${e.campaign}</td>
              <td>${e.orders}</td>
              <td>${e.effectiveDelivered}</td>
              <td>${Math.round(e.deliveryRate)}%</td>
              <td class="${e.netProfit >= 0 ? 'profit-pos' : 'profit-neg'}">${fmt(e.netProfit)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      Rapport généré par NokiMetrics • ${brand} • ${dateStr}<br>
      créé par Lindark Ecosystem
    </div>
    </body></html>
  `);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
  
  closeExportModal();
  showToast('📄 Rapport PDF généré avec succès');
}
// ===================== MODE CEO =====================
let ceoPin = '';
const ceoDefaultPin = '0000';

function getCEOPin() { return state.ceoPIN || ceoDefaultPin; }
function getFixedCharges() { return state.fixedCharges || []; }
function saveFixedCharges(charges) { state.fixedCharges = charges; saveState(); updateCEODashboard(); }

function openCEOPin() {
  ceoPin = '';
  updateCEODots();
  document.getElementById('ceoPinError').textContent = '';
  document.getElementById('ceoPinOverlay').classList.add('open');
  closeSidebar();
}

function closeCEOPin() {
  document.getElementById('ceoPinOverlay').classList.remove('open');
  ceoPin = '';
  updateCEODots();
}

function ceoAddDigit(d) {
  if (ceoPin.length >= 4) return;
  ceoPin += d;
  updateCEODots();
  if (ceoPin.length === 4) {
    setTimeout(() => {
      if (ceoPin === getCEOPin()) {
        document.getElementById('ceoPinError').textContent = '';
        closeCEOPin();
        openCEOMain();
      } else {
        document.getElementById('ceoPinError').textContent = 'Code PIN incorrect • Réessayez';
        ceoPin = '';
        updateCEODots();
      }
    }, 200);
  }
}

function ceoRemoveDigit() {
  ceoPin = ceoPin.slice(0, -1);
  updateCEODots();
}

function updateCEODots() {
  const dots = document.querySelectorAll('#ceoDots .ceo-pin-dot');
  dots.forEach((d, i) => d.classList.toggle('filled', i < ceoPin.length));
}

function openCEOMain() {
  document.getElementById('ceoMain').classList.add('open');
  updateCEODashboard();
  document.body.style.overflow = 'hidden';
}

function closeCEOMode() {
  document.getElementById('ceoMain').classList.remove('open');
  document.body.style.overflow = '';
}

function updateCEODashboard() {
  const entries = state.entries.length ? state.entries.map(computeEntry) : [];
  const charges = getFixedCharges();
  const totalFixes = charges.reduce((s, c) => s + (+c.amount || 0), 0);
  
  // Calculs globaux
  const agg = entries.reduce((a, e) => {
    a.net += e.netProfit;
    a.del += e.effectiveDelivered;
    a.orders += +e.orders || 0;
    return a;
  }, { net: 0, del: 0, orders: 0 });
  
  const profitBrut = agg.net;
  const profitReel = profitBrut - totalFixes;
  const avgMarginPerDel = agg.del > 0 ? agg.net / agg.del : 0;
  const breakEvenUnits = avgMarginPerDel > 0 ? Math.ceil(totalFixes / avgMarginPerDel) : 0;
  const margeSecu = breakEvenUnits > 0 ? Math.max(0, agg.del - breakEvenUnits) : agg.del;
  const couverturePct = totalFixes > 0 ? Math.min(100, Math.round((profitBrut / totalFixes) * 100)) : (profitBrut >= 0 ? 100 : 0);
  
  document.getElementById('ceo_net_brut').textContent = fmt(profitBrut);
  document.getElementById('ceo_net_reel').textContent = fmt(profitReel);
  document.getElementById('ceo_break_even').textContent = fmtNum(breakEvenUnits) + ' ventes';
  document.getElementById('ceo_marge_secu').textContent = fmtNum(margeSecu) + ' ventes';
  document.getElementById('ceo_progress_fill').style.width = couverturePct + '%';
  document.getElementById('ceo_progress_text').textContent = couverturePct + '% couvert';
  document.getElementById('ceo_progress_ventes').textContent = agg.del + ' ventes / ' + breakEvenUnits + ' nécessaires';
  
  const insight = document.getElementById('ceoInsight');
  if (totalFixes === 0) {
    insight.className = 'ceo-insight-box warning';
    insight.textContent = ' Aucune charge fixe enregistrée. Ajoutez vos dépenses mensuelles.';
  } else if (profitReel < 0) {
    insight.className = 'ceo-insight-box critical';
    insight.textContent = `🔴 Statut Critique : Il vous manque ${fmtNum(Math.max(0, breakEvenUnits - agg.del))} ventes pour couvrir vos frais fixes (${fmt(totalFixes)}).`;
  } else if (couverturePct >= 100) {
    insight.className = 'ceo-insight-box success';
    insight.textContent = `🟢 Félicitations : Votre structure est rentabilisée. Chaque vente supplémentaire est du profit pur (+${fmt(profitReel)} net).`;
  } else {
    insight.className = 'ceo-insight-box warning';
    insight.textContent = `🟡 En progression : ${couverturePct}% des charges couvertes. Continuez vos efforts !`;
  }
  
  // Liste des charges
  document.getElementById('ceoChargeList').innerHTML = charges.map((c, i) => `
    <div class="ceo-charge-item">
      <span class="ceo-charge-label">${c.label}</span>
      <span class="ceo-charge-amount">${fmt(c.amount)}</span>
      <button class="ceo-charge-del" onclick="ceoDeleteCharge(${i})">✕</button>
    </div>
  `).join('');
  document.getElementById('ceo_total_fixes').textContent = fmt(totalFixes);
}

function ceoAddCharge() {
  const label = document.getElementById('ceoChargeLabel').value.trim();
  const amount = +document.getElementById('ceoChargeAmount').value || 0;
  if (!label || amount <= 0) return showToast('Remplissez le libellé et le montant');
  const charges = getFixedCharges();
  charges.push({ label, amount });
  saveFixedCharges(charges);
  document.getElementById('ceoChargeLabel').value = '';
  document.getElementById('ceoChargeAmount').value = '';
  showToast('Charge fixe ajoutée');
}

function ceoDeleteCharge(index) {
  const charges = getFixedCharges();
  charges.splice(index, 1);
  saveFixedCharges(charges);
  showToast('Charge supprimée');
}

// ===================== MODALE CHANGEMENT PIN REFONTE =====================
let pinChangeStep = 1;
let oldPinEntered = '';
let newPinEntered = '';
let confirmPinEntered = '';

function openPinChangeModal() {
  pinChangeStep = 1;
  oldPinEntered = '';
  newPinEntered = '';
  confirmPinEntered = '';
  
  const existingModal = document.getElementById('ceoPinChangeOverlay');
  if (existingModal) existingModal.remove();
  
  const modalHtml = `
    <div id="ceoPinChangeOverlay" class="ceo-pin-change-overlay">
      <div class="ceo-pin-change-modal">
        <div class="ceo-pin-change-header">
          <div class="ceo-pin-change-header-title">
            <span>🔒</span> Changer le PIN
          </div>
          <button class="modern-close" onclick="closePinChangeModal()">
  <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
</button>
        </div>
        <div class="ceo-pin-change-body" id="pinChangeBody"></div>
        <div class="ceo-pin-change-footer">
          <button class="ceo-pin-cancel-btn" onclick="closePinChangeModal()">Annuler</button>
          <button class="ceo-pin-confirm-btn" id="pinChangeNextBtn">Suivant</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  updatePinChangeStepUI();
  
  setTimeout(() => {
    const overlay = document.getElementById('ceoPinChangeOverlay');
    if (overlay) overlay.classList.add('open');
  }, 10);
}

function closePinChangeModal() {
  const overlay = document.getElementById('ceoPinChangeOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
}

function updatePinChangeStepUI() {
  const body = document.getElementById('pinChangeBody');
  const nextBtn = document.getElementById('pinChangeNextBtn');
  if (!body) return;
  
  let html = '';
  
  if (pinChangeStep === 1) {
    html = `
      <div class="ceo-pin-change-step">
        <div class="ceo-pin-change-step-title">
          <span class="ceo-pin-change-step-badge">Étape 1/3</span>
          PIN actuel
        </div>
        <div class="ceo-pin-input-group" id="oldPinDigits">
          ${Array(4).fill().map((_, i) => `<div class="ceo-pin-digit" data-pos="${i}">•</div>`).join('')}
        </div>
        <div class="ceo-pin-keyboard" id="oldPinKeyboard"></div>
        <div id="oldPinError" class="ceo-pin-error hidden">
          <span>⚠️</span> PIN incorrect
        </div>
      </div>
    `;
    nextBtn.textContent = 'Vérifier';
    setTimeout(() => {
      generatePinKeyboard('old');
      updatePinDigits('oldPinDigits', oldPinEntered);
    }, 50);
  } else if (pinChangeStep === 2) {
    html = `
      <div class="ceo-pin-change-step">
        <div class="ceo-pin-change-step-title">
          <span class="ceo-pin-change-step-badge">Étape 2/3</span>
          Nouveau PIN (4 chiffres)
        </div>
        <div class="ceo-pin-input-group" id="newPinDigits">
          ${Array(4).fill().map((_, i) => `<div class="ceo-pin-digit" data-pos="${i}">•</div>`).join('')}
        </div>
        <div class="ceo-pin-keyboard" id="newPinKeyboard"></div>
        <div id="newPinError" class="ceo-pin-error hidden">
          <span>⚠️</span> Le PIN doit contenir 4 chiffres
        </div>
      </div>
    `;
    nextBtn.textContent = 'Confirmer';
    setTimeout(() => {
      generatePinKeyboard('new');
      updatePinDigits('newPinDigits', newPinEntered);
    }, 50);
  } else if (pinChangeStep === 3) {
    html = `
      <div class="ceo-pin-change-step">
        <div class="ceo-pin-change-step-title">
          <span class="ceo-pin-change-step-badge">Étape 3/3</span>
          Confirmer le nouveau PIN
        </div>
        <div class="ceo-pin-input-group" id="confirmPinDigits">
          ${Array(4).fill().map((_, i) => `<div class="ceo-pin-digit" data-pos="${i}">•</div>`).join('')}
        </div>
        <div class="ceo-pin-keyboard" id="confirmPinKeyboard"></div>
        <div id="confirmPinError" class="ceo-pin-error hidden">
          <span>⚠️</span> Les PIN ne correspondent pas
        </div>
        <div id="pinSuccessMsg" class="ceo-pin-success hidden">
          <span>✅</span> PIN modifié avec succès !
        </div>
      </div>
    `;
    nextBtn.textContent = 'Valider';
    setTimeout(() => {
      generatePinKeyboard('confirm');
      updatePinDigits('confirmPinDigits', confirmPinEntered);
    }, 50);
  }
  
  body.innerHTML = html;
  
  if (nextBtn) {
    nextBtn.onclick = handlePinChangeStep;
  }
}

function generatePinKeyboard(target) {
  const container = document.getElementById(`${target}PinKeyboard`);
  if (!container) return;
  
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  
  container.innerHTML = keys.map(key => {
    let extraClass = '';
    let onClick = '';
    
    if (key === '⌫') {
      extraClass = 'clear';
      onClick = `removePinDigit('${target}')`;
    } else if (key === '✓') {
      extraClass = '';
      onClick = `validateCurrentStep('${target}')`;
    } else {
      onClick = `addPinDigit('${target}', '${key}')`;
    }
    
    return `<button class="ceo-pin-keyboard-btn ${extraClass}" onclick="${onClick}">${key}</button>`;
  }).join('');
}

function addPinDigit(target, digit) {
  if (target === 'old' && oldPinEntered.length < 4) {
    oldPinEntered += digit;
    updatePinDigits('oldPinDigits', oldPinEntered);
    hidePinError('old');
  } else if (target === 'new' && newPinEntered.length < 4) {
    newPinEntered += digit;
    updatePinDigits('newPinDigits', newPinEntered);
    hidePinError('new');
  } else if (target === 'confirm' && confirmPinEntered.length < 4) {
    confirmPinEntered += digit;
    updatePinDigits('confirmPinDigits', confirmPinEntered);
    hidePinError('confirm');
  }
}

function removePinDigit(target) {
  if (target === 'old') {
    oldPinEntered = oldPinEntered.slice(0, -1);
    updatePinDigits('oldPinDigits', oldPinEntered);
  } else if (target === 'new') {
    newPinEntered = newPinEntered.slice(0, -1);
    updatePinDigits('newPinDigits', newPinEntered);
  } else if (target === 'confirm') {
    confirmPinEntered = confirmPinEntered.slice(0, -1);
    updatePinDigits('confirmPinDigits', confirmPinEntered);
  }
}

function updatePinDigits(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const digits = container.querySelectorAll('.ceo-pin-digit');
  digits.forEach((digit, i) => {
    if (value && value[i]) {
      digit.textContent = value[i];
      digit.classList.add('filled');
    } else {
      digit.textContent = '•';
      digit.classList.remove('filled');
    }
  });
}

function hidePinError(step) {
  let errorId = step === 'old' ? 'oldPinError' : (step === 'new' ? 'newPinError' : 'confirmPinError');
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.classList.add('hidden');
}

function showPinError(step) {
  let errorId = step === 'old' ? 'oldPinError' : (step === 'new' ? 'newPinError' : 'confirmPinError');
  const errorEl = document.getElementById(errorId);
  if (errorEl) errorEl.classList.remove('hidden');
}

function validateCurrentStep(step) {
  if (step === 'old') {
    if (oldPinEntered.length !== 4) {
      showPinError('old');
      return;
    }
    
    const expectedPin = state.ceoPIN || '0000';
    if (oldPinEntered === expectedPin) {
      pinChangeStep = 2;
      updatePinChangeStepUI();
    } else {
      showPinError('old');
      const digits = document.querySelectorAll('#oldPinDigits .ceo-pin-digit');
      digits.forEach(d => {
        d.style.animation = 'shake 0.4s ease';
        setTimeout(() => { if(d) d.style.animation = ''; }, 400);
      });
    }
  } else if (step === 'new') {
    if (newPinEntered.length !== 4) {
      showPinError('new');
      return;
    }
    pinChangeStep = 3;
    updatePinChangeStepUI();
  } else if (step === 'confirm') {
    if (confirmPinEntered.length !== 4) {
      showPinError('confirm');
      return;
    }
    
    if (newPinEntered !== confirmPinEntered) {
      showPinError('confirm');
      const digits = document.querySelectorAll('#confirmPinDigits .ceo-pin-digit');
      digits.forEach(d => {
        d.style.animation = 'shake 0.4s ease';
        setTimeout(() => { if(d) d.style.animation = ''; }, 400);
      });
      return;
    }
    
    if (newPinEntered === oldPinEntered) {
      const errorEl = document.getElementById('confirmPinError');
      if (errorEl) {
        errorEl.innerHTML = '<span>⚠️</span> Le nouveau PIN est identique à l\'ancien';
        errorEl.classList.remove('hidden');
      }
      return;
    }
    
    state.ceoPIN = newPinEntered;
    saveState();
    
    const successMsg = document.getElementById('pinSuccessMsg');
    if (successMsg) successMsg.classList.remove('hidden');
    
    const nextBtn = document.getElementById('pinChangeNextBtn');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.style.opacity = '0.6';
    }
    
    setTimeout(() => {
      closePinChangeModal();
      showToast('✅ PIN changé avec succès !');
      const securityBtn = document.querySelector('.ceo-pin-change-btn');
      if (securityBtn) {
        securityBtn.style.backgroundColor = 'var(--green)';
        securityBtn.style.color = '#fff';
        setTimeout(() => {
          if(securityBtn) {
            securityBtn.style.backgroundColor = '';
            securityBtn.style.color = '';
          }
        }, 500);
      }
    }, 1500);
  }
}

function handlePinChangeStep() {
  if (pinChangeStep === 1) {
    validateCurrentStep('old');
  } else if (pinChangeStep === 2) {
    validateCurrentStep('new');
  } else if (pinChangeStep === 3) {
    validateCurrentStep('confirm');
  }
}

// NOUVELLE VERSION de ceoChangePin - REMPLACE l'ancienne
function ceoChangePin() {
  openPinChangeModal();
}

function toggleTheme() {
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  
  // Animation de transition
  document.body.style.transition = 'background 0.3s ease, color 0.2s ease';
  
  if (toggle.checked) {
    html.setAttribute('data-theme', 'light');
    state.theme = 'light';
  } else {
    html.setAttribute('data-theme', 'dark');
    state.theme = 'dark';
  }
  saveState();
  
  // Retirer la transition après l'animation
  setTimeout(() => {
    document.body.style.transition = '';
  }, 300);
}

function applyTheme() {
  const theme = state.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.checked = (theme === 'light');
  }
}

function canChangeCurrency() {
  const lastChange = localStorage.getItem('noki_currency_change_date');
  if (!lastChange) return true;
  const lastDate = new Date(lastChange);
  const now = new Date();
  const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 jours en millisecondes
  return (now - lastDate) >= oneMonth;
}

function getNextChangeDate() {
  const lastChange = localStorage.getItem('noki_currency_change_date');
  if (!lastChange) return null;
  const lastDate = new Date(lastChange);
  const nextDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  return nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function setCurrency(v, force = false) {
  // Vérifier si on peut changer (sauf si forcé ou si la devise secondaire est sélectionnée)
  if (!force && state.currency !== v && state.currency !== '') {
    if (!canChangeCurrency()) {
      const nextDate = getNextChangeDate();
      showToast('🔒 Vous pourrez changer votre devise après le ' + nextDate);
      // Remettre l'ancienne valeur dans les sélecteurs
      document.getElementById('currencySelect').value = state.currency;
      document.getElementById('mobileCurrencySelect').value = state.currency;
      document.getElementById('settingsCurrency').value = state.currency;
      return;
    }
    // Enregistrer la date de changement
    localStorage.setItem('noki_currency_change_date', new Date().toISOString());
  }
  
  state.currency = v;
  document.getElementById('currencySelect').value = v;
  document.getElementById('mobileCurrencySelect').value = v;
  document.getElementById('settingsCurrency').value = v;
  document.querySelectorAll('.curr-sym').forEach(el => el.textContent = v);
  saveState();
  updateDashboard();
  updateAnalytics();
  runSim();
  showToast('✅ Devise changée : ' + v);
}
document.getElementById('currencySelect').addEventListener('change', e => setCurrency(e.target.value));
document.getElementById('mobileCurrencySelect').addEventListener('change', e => setCurrency(e.target.value));

function computeIntelligence(entries) {
  if (!entries.length) return null;
  const agg = entries.reduce((a, e) => {
    const c = computeEntry(e);
    a.netProfit   += c.netProfit;
    a.totalSpend  += c.spend;
    a.totalOrders += +e.orders || 0;
    a.totalDel    += c.effectiveDelivered;
    a.totalCost   += c.totalCost;
    a.totalRev    += c.revenue;
    return a;
  }, { netProfit:0, totalSpend:0, totalOrders:0, totalDel:0, totalCost:0, totalRev:0 });

  const deliveryRate = agg.totalOrders > 0 ? (agg.totalDel / agg.totalOrders) * 100 : 0;
  const avgCpa       = agg.totalOrders > 0 ? agg.totalSpend / agg.totalOrders : 0;
  const roi          = agg.totalCost > 0 ? (agg.netProfit / agg.totalCost) * 100 : 0;

  const latest = entries[entries.length - 1];
  const lc = computeEntry(latest);

  let signal = 'neutral', title = '', body = '', tags = [];

  if (lc.cpaReal > lc.breakEvenCpa && lc.breakEvenCpa > 0) {
    signal = 'red';
    title  = 'Alerte financiere — Campagne deficitaire';
    body   = `Le CPA réel (${fmt(lc.cpaReal)}) dépasse le seuil de rentabilité (${fmt(lc.breakEvenCpa)}). Vous perdez ${fmt(Math.abs(lc.netProfit))} sur cette période. Suspendez ou réajustez immédiatement le ciblage.`;
    tags   = [`CPA réel ${fmt(lc.cpaReal)}`, `Seuil ${fmt(lc.breakEvenCpa)}`, `Perte ${fmtPct(lc.roiPercent)}`];
  } else if (deliveryRate < state.alertDelivery && deliveryRate > 0) {
    signal = 'amber';
    title  = 'Alerte logistique — Taux de livraison critique';
    body   = `Le taux de livraison est de ${fmtPct(deliveryRate)}, sous le seuil critique de ${state.alertDelivery}%. Des revenus sont perdus en aval. Analysez les raisons de refus et renforcez la confirmation pre-expedition.`;
    tags   = [`Livraison ${fmtPct(deliveryRate)}`, `Seuil ${state.alertDelivery}%`, `Manque à gagner estimé`];
  } else if (roi < state.alertRoi && agg.totalOrders > 0) {
    signal = 'amber';
    title  = 'ROI sous le seuil minimum';
    body   = `Le ROI global est de ${fmtPct(roi)}, inférieur à votre objectif de ${state.alertRoi}%. Revoyez la structure des coûts ou augmentez le prix de vente.`;
    tags   = [`ROI ${fmtPct(roi)}`, `Objectif ${state.alertRoi}%`];
  } else if (agg.totalOrders > 0) {
    signal = 'green';
    title  = 'Signal positif — Conditions favorables a la montee en charge';
    body   = `Bénéfice net de ${fmt(agg.netProfit)} avec un ROI de ${fmtPct(roi)}. Le CPA réel (${fmt(avgCpa)}) est sous le point mort. Vous pouvez augmenter le budget progressivement de 15 à 20% par palier.`;
    tags   = [`ROI ${fmtPct(roi)}`, `Livraison ${fmtPct(deliveryRate)}`, `CPA ${fmt(avgCpa)}`];
  }

  return { signal, title, body, tags };
}

function applyIntelligence(intel) {
  const card = document.getElementById('intelCard');
  const iconEl = document.getElementById('intelIcon');
  card.className = 'intel-card ' + (intel ? intel.signal : 'neutral');
  if (!intel) {
    document.getElementById('intelTitle').textContent = 'En attente de données';
    document.getElementById('intelBody').textContent  = 'Enregistrez votre première performance pour recevoir un diagnostic stratégique.';
    document.getElementById('intelMeta').innerHTML = '';
    return;
  }
  document.getElementById('intelTitle').textContent = intel.title;
  document.getElementById('intelBody').textContent  = intel.body;
  document.getElementById('intelMeta').innerHTML = intel.tags.map(t => `<span class="intel-tag">${t}</span>`).join('');

  const icons = {
    red:     `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>`,
    amber:   `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>`,
    green:   `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8-8 8-4-4-6 6"/>`,
    neutral: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>`
  };
  iconEl.innerHTML = icons[intel ? intel.signal : 'neutral'];
}

function updateDashboard() {
  const entries = getFilteredEntries().map(computeEntry);
  const intel   = computeIntelligence(getFilteredEntries());
  applyIntelligence(intel);

  if (!entries.length) {
    ['kpi_net','kpi_delivery','kpi_cpa','kpi_cpa_delivered','kpi_delivered'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    document.getElementById('kpi_roi').textContent = 'ROI —';
    document.getElementById('kpi_roi').className = 'kpi-delta neutral';
    document.getElementById('kpi_delivery_bar').style.width = '0%';
    document.getElementById('historyList').innerHTML = `<div class="empty-state">
      <svg class="empty-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/></svg>
      <div class="empty-title">Aucune saisie</div>
      <div style="font-size:12px">Commencez par enregistrer une journée</div>
    </div>`;
    updateChart([]);
    return;
  }

  // Agrégation des données (TOUTES les valeurs sont déjà en devise principale)
  const agg = entries.reduce((a, e) => {
    a.net    += e.netProfit;
    a.spend  += e.spend;      // ← e.spend est DÉJÀ converti (grâce à computeEntry)
    a.orders += +e.orders || 0;
    a.del    += e.effectiveDelivered;
    a.cost   += e.totalCost;
    a.rev    += e.revenue;
    return a;
  }, {net:0, spend:0, orders:0, del:0, cost:0, rev:0});

  // Calculs des indicateurs (utilisent agg.spend déjà converti)
  const delivery = agg.orders ? (agg.del / agg.orders) * 100 : 0;
  const cpa      = agg.orders ? agg.spend / agg.orders : 0;           // ← CPA commandes (CORRECT)
  const roi      = agg.cost   ? (agg.net / agg.cost) * 100 : 0;
  
  // CPA réel basé sur les colis livrés (CORRECT aussi)
  const cpaDelivered = agg.del > 0 ? agg.spend / agg.del : 0;

  // Mise à jour des éléments du DOM
// ANIMATION : Stocker les anciennes valeurs pour l'animation
const oldNet = parseFloat(document.getElementById('kpi_net').textContent?.replace(/[^0-9.-]/g, '') || 0);
const newNet = agg.net;

document.getElementById('kpi_net').textContent = fmt(agg.net);
document.getElementById('kpi_delivery').textContent = fmtPct(delivery);
document.getElementById('kpi_cpa').textContent = fmt(cpa);
document.getElementById('kpi_cpa_delivered').textContent = fmt(cpaDelivered);
document.getElementById('kpi_delivered').textContent = fmtNum(agg.del);

// Déclencher l'animation si la valeur a changé significativement
if (Math.abs(newNet - oldNet) > 0.01) {
  animateValueChange('kpi_net', oldNet, newNet, true);
}
  document.getElementById('kpi_rev').textContent       = 'Rev. bruts ' + fmt(agg.rev);
  document.getElementById('kpi_delivery_bar').style.width = Math.min(100, delivery) + '%';

  const roiEl = document.getElementById('kpi_roi');
  roiEl.textContent  = 'ROI ' + fmtPct(roi);
  roiEl.className    = 'kpi-delta ' + (roi >= 0 ? 'up' : 'down');

  // Historique (utilise les valeurs converties)
  const sorted = [...entries].sort((a,b) => new Date(b.dateISO) - new Date(a.dateISO));
  document.getElementById('historyList').innerHTML = sorted.slice(0, 15).map(e => `
    <div class="history-item" style="cursor:pointer" onclick="filterByCampaign('${e.campaign.replace(/'/g, "\\'")}')">
      <div>
        <span class="history-date">${e.dateISO ? e.dateISO.slice(5).replace('-','/') : ''}</span>
      </div>
      <div class="history-camp">${e.campaign}</div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
        <span class="history-profit ${e.netProfit >= 0 ? 'pos' : 'neg'}">${fmt(e.netProfit)}</span>
        <span class="history-delivery">${fmtPct(e.deliveryRate)} livré</span>
      </div>
      <button class="history-del-btn" onclick="event.stopPropagation(); deleteEntry(${e.id})" title="Supprimer">✕</button>
    </div>
  `).join('');

  updateChart(sorted.slice(-10).reverse());
  updateCEODashboard();
}
// ===================== ANIMATION DES VALEURS =====================
function animateValueChange(elementId, oldValue, newValue, isProfit = false) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  // Retirer les classes existantes
  element.classList.remove('pulse-up', 'pulse-down');
  
  // Forcer le reflow pour réinitialiser l'animation
  void element.offsetWidth;
  
  // Ajouter la classe selon la direction
  if (newValue > oldValue) {
    element.classList.add('pulse-up');
  } else if (newValue < oldValue) {
    element.classList.add('pulse-down');
  }
  
  // Nettoyer après l'animation
  setTimeout(() => {
    element.classList.remove('pulse-up', 'pulse-down');
  }, 400);
}

// Fonction pour animer le bouton de validation
function animateSubmitButton(btn, success = true) {
  if (!btn) return;
  
  // Désactiver le bouton pendant l'animation
  btn.classList.add('loading');
  btn.disabled = true;
  
  if (success) {
    setTimeout(() => {
      btn.classList.remove('loading');
      btn.classList.add('success');
      
      setTimeout(() => {
        btn.classList.remove('success');
        btn.disabled = false;
      }, 500);
    }, 800);
  } else {
    setTimeout(() => {
      btn.classList.remove('loading');
      btn.disabled = false;
      // Ajouter une animation d'erreur optionnelle
      btn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
      setTimeout(() => {
        btn.style.background = '';
      }, 500);
    }, 800);
  }
}

function updateChart(entries) {
  const ctx = document.getElementById('profitChart').getContext('2d');
  const labels = entries.map(e => e.dateISO ? e.dateISO.slice(5).replace('-','/') : '');
  const data   = entries.map(e => e.netProfit);

  if (profitChart) {
    profitChart.data.labels = labels;
    profitChart.data.datasets[0].data = data;
    profitChart.update();
    return;
  }
  profitChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Bénéfice net', data, borderColor: '#2755e6', backgroundColor: ctx => { const g = ctx.chart.ctx.createLinearGradient(0,0,0,200); g.addColorStop(0,'rgba(39,85,230,.15)'); g.addColorStop(1,'rgba(39,85,230,0)'); return g; }, tension: 0.35, fill: true, pointBackgroundColor: d => d.raw >= 0 ? '#2755e6' : '#d63b3b', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4, borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } }, scales: { x: { grid: { display: false }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8492a6' } }, y: { grid: { color: '#f0f0f0' }, ticks: { font: { family: 'JetBrains Mono', size: 10 }, color: '#8492a6', callback: v => fmtNum(v) } } } }
  });
}

function updateAnalytics() {
  const entries = getFilteredEntries().map(computeEntry);
  if (!entries.length) return;

  const agg = entries.reduce((a, e) => {
    a.ads  += +e.spend || 0;
    a.prod += (+e.orders || 0) * (+e.buy || 0);
    a.ship += +e.ship || 0;
    a.call += +e.call || 0;
    a.other+= +e.other || 0;
    return a;
  }, {ads:0, prod:0, ship:0, call:0, other:0});

  const ctx2 = document.getElementById('costChart').getContext('2d');
  if (costChart) costChart.destroy();
  costChart = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: ['Publicité', 'Produit', 'Livraison', 'Call center', 'Autres'], datasets: [{ data: [agg.ads, agg.prod, agg.ship, agg.call, agg.other], backgroundColor: ['#2755e6','#0fa37f','#e07b0e','#6366f1','#94a3b8'], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 8 } }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) } } }, cutout: '65%' }
  });

  const sorted = [...entries].sort((a,b) => new Date(a.dateISO) - new Date(b.dateISO)).slice(-10);
  const ctx3 = document.getElementById('deliveryChart').getContext('2d');
  if (deliveryChart) deliveryChart.destroy();
  
  const maxOrders = Math.max(...sorted.map(e => +e.orders || 1), 1);
  
  deliveryChart = new Chart(ctx3, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Taux de livraison',
        data: sorted.map((e, i) => ({
          x: i,
          y: e.deliveryRate,
          r: ((+e.orders || 1) / maxOrders) * 25
        })),
        backgroundColor: sorted.map(e => 
          e.deliveryRate >= state.alertDelivery ? 'rgba(15,163,127,0.6)' : 'rgba(214,59,59,0.6)'
        ),
        borderColor: sorted.map(e => 
          e.deliveryRate >= state.alertDelivery ? 'rgba(15,163,127,1)' : 'rgba(214,59,59,1)'
        ),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const e = sorted[ctx.dataIndex];
              return [
                `Date: ${e.dateISO || ''}`,
                `Taux: ${fmtPct(e.deliveryRate)}`,
                `Commandes: ${e.orders}`,
                `Livrés: ${e.effectiveDelivered}`,
                `Bénéfice: ${fmt(e.netProfit)}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            callback: function(value) {
              const e = sorted[value];
              return e && e.dateISO ? e.dateISO.slice(5).replace('-','/') : '';
            },
            font: { family: 'JetBrains Mono', size: 10 },
            color: '#8492a6'
          },
          grid: { display: false }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: v => v + '%',
            font: { family: 'JetBrains Mono', size: 10 },
            color: '#8492a6'
          },
          grid: { color: '#f0f0f0' }
        }
      }
    }
  });
  const bycamp = {};
  entries.forEach(e => { if (!bycamp[e.campaign]) bycamp[e.campaign] = { net: 0, rev: 0 }; bycamp[e.campaign].net += e.netProfit; bycamp[e.campaign].rev += e.revenue; });
  const campArr = Object.entries(bycamp).sort((a,b) => b[1].net - a[1].net);
  const maxNet  = Math.max(...campArr.map(c => Math.abs(c[1].net)), 1);
  document.getElementById('campBars').innerHTML = campArr.map(([name, v]) => { const pct = Math.round(Math.abs(v.net) / maxNet * 100); const cls = v.net > 0 ? 'green' : (v.net === 0 ? '' : 'red'); return `<div class="perf-bar-item"><div class="perf-bar-meta"><span class="perf-bar-name">${name}</span><span class="perf-bar-val">${fmt(v.net)}</span></div><div class="perf-bar-track"><div class="perf-bar-fill ${cls}" style="width:${pct}%"></div></div></div>`; }).join('');

  const totalOrders = entries.reduce((a,e) => a + (+e.orders||0), 0);
  const totalDel    = entries.reduce((a,e) => a + e.effectiveDelivered, 0);
  const totalNet    = entries.reduce((a,e) => a + e.netProfit, 0);
  const totalCost   = entries.reduce((a,e) => a + e.totalCost, 0);
  const totalRev    = entries.reduce((a,e) => a + e.revenue, 0);
  const avgDelivery = totalOrders ? (totalDel/totalOrders)*100 : 0;
  const avgCpa      = totalOrders ? entries.reduce((a,e) => a + (+e.spend||0), 0) / totalOrders : 0;
  const roi         = totalCost ? (totalNet/totalCost)*100 : 0;

  document.getElementById('statsTable').innerHTML = [ ['Nombre de saisies', entries.length], ['Total commandes', fmtNum(totalOrders)], ['Total livrés', fmtNum(totalDel)], ['Taux livraison moyen', fmtPct(avgDelivery)], ['CPA moyen', fmt(avgCpa)], ['Revenus bruts', fmt(totalRev)], ['Coûts totaux', fmt(totalCost)], ['Bénéfice net', fmt(totalNet)], ['ROI global', fmtPct(roi)] ].map(([l,v]) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--muted)">${l}</span><span style="font-weight:700;font-family:var(--font-m)">${v}</span></div>`).join('');
}

function getFilteredEntries() {
  const { campaign, dateFrom, dateTo } = state.filters;
  return state.entries.filter(e => {
    // Filtre campagne (recherche insensible à la casse)
    if (campaign && !e.campaign.toLowerCase().includes(campaign.toLowerCase())) return false;
    // Filtre date début
    if (dateFrom && e.dateISO < dateFrom) return false;
    // Filtre date fin
    if (dateTo && e.dateISO > dateTo) return false;
    return true;
  });
}

function applyFilters() {
  const campaign = document.getElementById('filterCampaign').value.trim();
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo   = document.getElementById('filterDateTo').value;
  
  state.filters = { campaign, dateFrom, dateTo };
  saveState();
  
  // Afficher/masquer le bouton Reset
  const hasFilters = campaign || dateFrom || dateTo;
  const btn = document.getElementById('filterResetBtn');
  const badge = document.getElementById('filterBadge');
  const badgeText = document.getElementById('filterBadgeText');
  const viewAllBtn = document.getElementById('viewAllBtn');
  
  btn.style.display = hasFilters ? 'flex' : 'none';
  viewAllBtn.style.display = hasFilters ? 'block' : 'none';
  
  if (hasFilters) {
    badge.style.display = 'flex';
    const parts = [];
    if (campaign) parts.push(`Campagne: "${campaign}"`);
    if (dateFrom) parts.push(`Du: ${dateFrom.split('-').reverse().join('/')}`);
    if (dateTo) parts.push(`Au: ${dateTo.split('-').reverse().join('/')}`);
    badgeText.textContent = parts.join(' • ');
  } else {
    badge.style.display = 'none';
  }
  
  updateDashboard();
  updateAnalytics();
}

function resetFilters() {
  document.getElementById('filterCampaign').value = '';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  applyFilters();
}

function filterByCampaign(campaignName) {
  document.getElementById('filterCampaign').value = campaignName;
  applyFilters();
  showToast(`Filtré : "${campaignName}"`);
}
// Remplir le dropdown des produits du stock
function populateStockDropdown() {
  const sel = document.getElementById('f_stock_product');
  if (!sel) return;
  const data = getStockData();
  sel.innerHTML = '<option value="">— Saisie manuelle —</option>';
  data.products.forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${p.name} (Achat: ${fmt(p.buy)} | Vente: ${fmt(p.sell)} | Stock: ${p.qty})</option>`;
  });
}

function onStockProductSelect() {
  const sel = document.getElementById('f_stock_product');
  if (!sel || !sel.value) {
    document.getElementById('f_campaign').value = '';
    document.getElementById('f_buy').value = '';
    document.getElementById('f_sell').value = '';
    liveUpdate();
    return;
  }
  const data = getStockData();
  const product = data.products.find(p => p.id === +sel.value);
  if (!product) return;
  
  document.getElementById('f_campaign').value = product.name;
  document.getElementById('f_buy').value = product.buy;
  
  if (!document.getElementById('f_sell').value || document.getElementById('f_sell').value === '0') {
    document.getElementById('f_sell').value = product.sell;
  }
  
  liveUpdate();
  showToast('Produit sélectionné : ' + product.name);
}
function liveUpdate() {
  const spend = +document.getElementById('f_spend').value || 0;
  const orders = +document.getElementById('f_orders').value || 0;
  const delivered = +document.getElementById('f_delivered').value || 0;
  const buy = +document.getElementById('f_buy').value || 0;
  const sell = +document.getElementById('f_sell').value || 0;
  const ship = +document.getElementById('f_ship').value || 0;
  const call = +document.getElementById('f_call').value || 0;
  const returns = +document.getElementById('f_returns').value || 0;
  const other = +document.getElementById('f_other').value || 0;

  // Afficher l'aperçu dès qu'il y a des données, pas seulement si sell && buy
  if (!spend && !orders && !delivered && !buy && !sell) {
    document.getElementById('livePreview').style.display = 'none';
    return;
  }
  
  document.getElementById('livePreview').style.display = 'block';

  const e = { 
    spend, orders, delivered, buy, sell, ship, call, returns, other, confirmed: orders,
    spendCurrency: document.getElementById('f_spend_currency')?.value || 'main',
    buyCurrency: document.getElementById('f_buy_currency')?.value || 'main',
    sellCurrency: document.getElementById('f_sell_currency')?.value || 'main',
    shipCurrency: document.getElementById('f_ship_currency')?.value || 'main',
    callCurrency: document.getElementById('f_call_currency')?.value || 'main',
    otherCurrency: document.getElementById('f_other_currency')?.value || 'main'
  };
  
  const c = computeEntry(e);

  document.getElementById('lp_cpa').textContent = fmt(c.cpaReal);
  document.getElementById('lp_be').textContent = fmt(c.breakEvenCpa);
  document.getElementById('lp_net').textContent = fmt(c.netProfit);
  document.getElementById('lp_net').className = 'lp-metric-value ' + (c.netProfit >= 0 ? 'pos' : 'neg');
  document.getElementById('lp_rate').textContent = fmtPct(c.deliveryRate);
  document.getElementById('lp_margin').textContent = fmt(c.marginPerDelivered);

  const vEl = document.getElementById('lp_verdict');
  if (orders > 0) {
    vEl.style.display = 'block';
    if (c.cpaReal > c.breakEvenCpa && c.breakEvenCpa > 0) {
      vEl.className = 'lp-verdict red';
      vEl.textContent = 'Campagne déficitaire — réajustez le CPA';
    } else if (c.deliveryRate < state.alertDelivery && delivered > 0) {
      vEl.className = 'lp-verdict amber';
      vEl.textContent = 'Taux de livraison critique';
    } else {
      vEl.className = 'lp-verdict green';
      vEl.textContent = 'Rentable — conditions correctes';
    }
  } else {
    vEl.style.display = 'none';
  }
}
['f_spend','f_orders','f_delivered','f_buy','f_sell','f_ship','f_call','f_returns','f_other'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', liveUpdate); });
['f_spend_currency','f_buy_currency','f_sell_currency','f_ship_currency','f_call_currency','f_other_currency'].forEach(id => { 
  const el = document.getElementById(id); 
  if (el) el.addEventListener('change', liveUpdate); 
});

document.getElementById('entryForm').addEventListener('submit', e => {
  e.preventDefault();
  const dateISO  = document.getElementById('f_date').value;
  const campaign = document.getElementById('f_campaign').value.trim();
  if (!dateISO || !campaign) return;

  const entry = { id: Date.now(), dateISO, campaign, 
    spend: +document.getElementById('f_spend').value || 0, 
    spendCurrency: document.getElementById('f_spend_currency')?.value || 'main',
    orders: +document.getElementById('f_orders').value || 0, 
    delivered: +document.getElementById('f_delivered').value || 0, 
    confirmed: +document.getElementById('f_orders').value || 0, 
    buy: +document.getElementById('f_buy').value || 0, 
    buyCurrency: document.getElementById('f_buy_currency')?.value || 'main',
    sell: +document.getElementById('f_sell').value || 0, 
    sellCurrency: document.getElementById('f_sell_currency')?.value || 'main',
    ship: +document.getElementById('f_ship').value || 0, 
    shipCurrency: document.getElementById('f_ship_currency')?.value || 'main',
    call: +document.getElementById('f_call').value || 0, 
    callCurrency: document.getElementById('f_call_currency')?.value || 'main',
    returns: +document.getElementById('f_returns').value || 0, 
    other: +document.getElementById('f_other').value || 0,
    otherCurrency: document.getElementById('f_other_currency')?.value || 'main'
  };

  state.entries.push(entry);
  saveState();
  
  // Mettre à jour le stock si un produit a été sélectionné
  const stockSel = document.getElementById('f_stock_product');
  if (stockSel && stockSel.value) {
    const deliveredQty = +document.getElementById('f_delivered').value || 0;
    const returnsQty = +document.getElementById('f_returns').value || 0;
    const productId = +stockSel.value;
    
    // Vérifier le stock avant toute modification
    if (deliveredQty > 0) {
      const data = getStockData();
      const product = data.products.find(p => p.id === productId);
      if (product && product.qty < deliveredQty) {
        showToast(`❌ Stock insuffisant pour "${product.name}" (disponible: ${product.qty}, demandé: ${deliveredQty})`);
        animateSubmitButton(submitBtn, false);
        return; // Annuler l'enregistrement
      }
    }
    
    // Appliquer les mouvements
    if (deliveredQty > 0) {
      stockMove(productId, 'out', deliveredQty, 'Vente via saisie campagne');
    }
    if (returnsQty > 0) {
      stockMove(productId, 'in', returnsQty, 'Retour/RMA via saisie campagne');
    }
  }
    
  updateDashboard();
  updateAnalytics();
  document.getElementById('entryForm').reset();
  document.getElementById('f_date').valueAsDate = new Date();
  document.getElementById('f_stock_product').value = '';
  document.getElementById('livePreview').style.display = 'none';
  showPanel('dashboard');
  showToast('Saisie enregistrée avec succès'); 
  setTimeout(() => {
    checkCPAAnomaly();
    checkStockAlerts();
  }, 2000);
});

window.deleteEntry = id => { state.entries = state.entries.filter(e => e.id !== id); saveState(); updateDashboard(); updateAnalytics(); showToast('Saisie supprimée'); };
async function clearAll() { 
  // Animation de confirmation avec délai
  const confirmed = await new Promise(resolve => {
    const result = confirm('⚠️ Effacer TOUTES les données ?\n\nCette action est IRRÉVERSIBLE...');
    resolve(result);
  });
  
  if (!confirmed) return;
  
  // Animation du bouton danger (feedback visuel)
  const dangerBtns = document.querySelectorAll('.btn-danger');
  dangerBtns.forEach(btn => {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = ''; }, 200);
  });
  
  try {
    // Vider IndexedDB
    if (window.clearAllEntriesDB) await clearAllEntriesDB();
    if (window.clearAllMovementsDB) await clearAllMovementsDB();
    if (window.clearAllFixedChargesDB) await clearAllFixedChargesDB();
    
    // Supprimer les produits un par un
    const products = await getAllProductsDB();
    for (const product of products) {
      await deleteProductDB(product.id);
    }
    
    // Vider state
    state.entries = []; 
    state.fixedCharges = [];
    state.filters = { campaign: '', dateFrom: '', dateTo: '' };
    
    // Nettoyer localStorage
    localStorage.removeItem('noki_stock');
    
    await saveState();
    
    // Réinitialiser UI
    document.getElementById('filterCampaign').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    document.getElementById('filterResetBtn').style.display = 'none';
    document.getElementById('filterBadge').style.display = 'none';
    document.getElementById('viewAllBtn').style.display = 'none';
    
    updateDashboard(); 
    updateAnalytics(); 
    showToast('🗑️ Toutes les données ont été supprimées'); 
    
  } catch(e) {
    console.error('Erreur clearAll:', e);
    showToast('❌ Erreur lors de la suppression');
  }
}

// ===================== VÉRIFICATION D'INTÉGRITÉ =====================
async function verifyDataIntegrity() {
  console.log('🔍 Vérification intégrité des données...');
  
  const entries = await getAllEntriesDB();
  const products = await getAllProductsDB();
  const movements = await getAllMovementsDB();
  
  let issues = [];
  
  // Vérifier les entrées orphelines
  for (const movement of movements) {
    const productExists = products.some(p => p.name === movement.product);
    if (!productExists && movement.type === 'out') {
      issues.push(`Mouvement orphelin: ${movement.product}`);
    }
  }
  
  // Vérifier les stocks négatifs
  for (const product of products) {
    if (product.qty < 0) {
      issues.push(`Stock négatif pour ${product.name}: ${product.qty}`);
    }
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ Problèmes d\'intégrité détectés:', issues);
    showToast(`⚠️ ${issues.length} anomalie(s) détectée(s) dans les données`);
  } else {
    console.log('✅ Intégrité des données OK');
  }
  
  return issues;
}
function runSim() {
  // Conversion devise
  const exRate = state.secondaryCurrency && state.exchangeRate ? state.exchangeRate : 0;
  const conv = (val, currency) => (currency === 'secondary' && exRate > 0) ? val / exRate : val;

  const buy = conv(+document.getElementById('s_buy').value || 0, document.getElementById('s_buy_currency')?.value || 'main');
  const sell = conv(+document.getElementById('s_sell').value || 0, document.getElementById('s_sell_currency')?.value || 'main');
  const rate = +document.getElementById('s_rate').value / 100;
  const margin = +document.getElementById('s_margin').value || 0;
  const shipUnit = +document.getElementById('s_ship_unit').value || 0;
  document.getElementById('s_rate_label').textContent = Math.round(rate*100) + '%';
  const grossMargin = sell - buy - shipUnit;
  const breakEven = grossMargin * rate;
  const ideal = (grossMargin - margin) * rate;
  const unitMargin = grossMargin;
  document.getElementById('s_ideal').textContent = fmt(Math.max(0, ideal));
  document.getElementById('s_be').textContent = fmt(Math.max(0, breakEven));
  document.getElementById('s_unit_margin').textContent = fmt(unitMargin);

  const rates = [.50,.55,.60,.65,.70,.75,.80];
  const cpaRange = [];
  const base = Math.max(0, breakEven);
  for (let i = -4; i <= 4; i++) cpaRange.push(Math.round(base + i * (base * 0.1)));
  const tbody = document.getElementById('simTableBody');
  tbody.innerHTML = cpaRange.map(cpa => { const cells = rates.map(r => { const profit = (sell - buy - shipUnit) * r * 1 - cpa; const cl = profit > 0.05 * (sell - buy) ? 'good' : profit < 0 ? 'bad' : 'warn'; return `<td class="${cl}">${fmtNum(profit)}</td>`; }); const isBreak = cpa === Math.round(breakEven); return `<tr class="${isBreak ? 'highlight' : ''}"><td class="mono">${fmt(cpa)}</td>${cells.join('')}</tr>`; }).join('');
  tbody.innerHTML = cpaRange.map(cpa => { const cells = rates.map(r => { const profit = (sell - buy - shipUnit) * r * 1 - cpa; const cl = profit > 0.05 * (sell - buy) ? 'good' : profit < 0 ? 'bad' : 'warn'; return `<td class="${cl}">${fmtNum(profit)}</td>`; }); const isBreak = cpa === Math.round(breakEven); return `<tr class="${isBreak ? 'highlight' : ''}"><td class="mono">${fmt(cpa)}</td>${cells.join('')}</tr>`; }).join('');
  
  calculateSuggestedPrice();  // ← AJOUTER ICI
  
}

function calculateSuggestedPrice() {
  const exRate = state.secondaryCurrency && state.exchangeRate ? state.exchangeRate : 0;
  const conv = (val, currency) => (currency === 'secondary' && exRate > 0) ? val / exRate : val;

  const buy = conv(+document.getElementById('s_buy').value || 0, document.getElementById('s_buy_currency')?.value || 'main');
  const sell = conv(+document.getElementById('s_sell').value || 0, document.getElementById('s_sell_currency')?.value || 'main');
  const rate = +document.getElementById('s_rate').value / 100;
  const shipUnit = +document.getElementById('s_ship_unit').value || 0;
  const targetMargin = +document.getElementById('s_margin').value || 0;
  
  if (buy <= 0) {
    document.getElementById('suggested_price').textContent = '—';
    document.getElementById('suggested_margin_info').textContent = '';
    document.getElementById('suggested_explanation').textContent = 'Saisissez un prix d\'achat';
    return;
  }
  
  // Prix de vente suggéré = Coûts (achat + livraison + CPA idéal) + Marge souhaitée
  const grossMarginWithoutCPA = sell - buy - shipUnit;
  const breakEvenCPA = grossMarginWithoutCPA * rate;
  const idealCPA = Math.max(0, breakEvenCPA - targetMargin);
  const suggestedSell = (buy + shipUnit + idealCPA) + targetMargin;
  
  const formattedPrice = Math.round(suggestedSell).toLocaleString('fr-FR') + ' ' + state.currency;
  document.getElementById('suggested_price').textContent = formattedPrice;
  
  const effectiveMargin = suggestedSell - buy - shipUnit - idealCPA;
  
  document.getElementById('suggested_margin_info').textContent = `Marge nette: ${fmt(effectiveMargin)}`;
  document.getElementById('suggested_explanation').textContent = 
    `Coûts totaux: ${fmt(buy + shipUnit + idealCPA)} | Marge: ${fmt(targetMargin)} | CPA cible: ${fmt(idealCPA)}`;
}

function applySettings() {
  const s = state;
  document.querySelectorAll('.curr-sym').forEach(el => el.textContent = s.currency);
  document.getElementById('currencySelect').value = s.currency;
  document.getElementById('mobileCurrencySelect').value = s.currency;
  document.getElementById('settingsCurrency').value = s.currency;
  document.getElementById('sidebarBrand').textContent = s.brand;
  document.getElementById('settingsBrandName').value = s.brand;
  document.getElementById('alertDelivery').value = s.alertDelivery;
  document.getElementById('alertRoi').value = s.alertRoi;
  // Devise secondaire & taux
  document.getElementById('settingsSecondaryCurrency').value = s.secondaryCurrency || '';
  document.getElementById('settingsExchangeRate').value = s.exchangeRate || 0;
  document.getElementById('settingsMainCurrencyLabel').textContent = s.currency;
  if (s.secondaryCurrency) {
    document.getElementById('exchangeRateRow').style.display = 'flex';
    document.getElementById('settingsSecondaryCurrencyLabel').textContent = s.secondaryCurrency;
    document.getElementById('settingsSecondaryCurrencyLabel2').textContent = s.secondaryCurrency;
  }
  // Mettre à jour les sélecteurs de devise dans le formulaire
  updateCurrencySelectors();
  if (s.logo) { document.getElementById('sidebarLogoWrap').innerHTML = `<img src="${s.logo}" class="sidebar-logo-small" alt="Logo">`; }
}
function updateCurrencySelectors() {
  const main = state.currency;
  const secondary = state.secondaryCurrency;
  const hasSecondary = secondary && state.exchangeRate > 0;
  
  document.querySelectorAll('.currency-select').forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = `<option value="main" style="background:#161B28;color:#fff;-webkit-text-fill-color:#fff">${main}</option>`;
    if (hasSecondary) {
      sel.innerHTML += `<option value="secondary" style="background:#161B28;color:#fff;-webkit-text-fill-color:#fff">${secondary}</option>`;
    }
    sel.value = currentVal === 'secondary' && hasSecondary ? 'secondary' : 'main';
    // Forcer le style du select lui-même
    sel.style.background = '#161B28';
    sel.style.color = '#fff';
    sel.style.webkitTextFillColor = '#fff';
  });
}
function saveBrandName() { state.brand = document.getElementById('settingsBrandName').value.trim() || 'NokiMetrics'; document.getElementById('sidebarBrand').textContent = state.brand; saveState(); }
function saveSettings() { 
  state.alertDelivery = +document.getElementById('alertDelivery').value || 50; 
  state.alertRoi = +document.getElementById('alertRoi').value || 0;
  // Devise secondaire & taux
  state.secondaryCurrency = document.getElementById('settingsSecondaryCurrency').value;
  state.exchangeRate = +document.getElementById('settingsExchangeRate').value || 0;
  // Afficher/masquer le taux
  const row = document.getElementById('exchangeRateRow');
  if (state.secondaryCurrency) {
    row.style.display = 'flex';
    document.getElementById('settingsSecondaryCurrencyLabel').textContent = state.secondaryCurrency;
    document.getElementById('settingsSecondaryCurrencyLabel2').textContent = state.secondaryCurrency;
    document.getElementById('settingsMainCurrencyLabel').textContent = state.currency;
  } else {
    row.style.display = 'none';
  }
  updateCurrencySelectors();
  if (!checkLocalStorage()) {
    showLocalStorageWarning();
    return;
  }
  saveState(); 
  updateDashboard();
  updateStockDashboard();
}
function resetSettings() { state.alertDelivery = 50; state.alertRoi = 0; applySettings(); saveState(); showToast('Paramètres réinitialisés'); }


function showToast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800); }

// ===================== NOUVELLE INITIALISATION =====================
async function init() {
  // Initialiser la sécurité AVANT tout
  initializeSecurity();
  
  // 1. Initialiser IndexedDB
  try {
    await initIndexedDB();
    console.log('✅ IndexedDB prête');
    
    // 2. Demander le stockage persistant
    await requestPersistentStorage();
    
    // 3. Migrer depuis localStorage si nécessaire
    await migrateFromLocalStorage();
    
    // 4. Synchroniser l'UI state depuis IndexedDB
    await syncUIStateToLocalStorage();
    
  } catch(e) {
    console.error('❌ Erreur initialisation IndexedDB:', e);
    showToast('⚠️ Mode dégradé - utilisation du stockage local uniquement');
  }
  
  // 5. Appliquer le thème
  applyTheme();
  
  // 6. Logique de navigation
  const isActivatedFlag = isActivated();
  const isConfigured = localStorage.getItem(SK_CONFIGURED) === 'true';
  const isTrialBlocked = localStorage.getItem('noki_trial_blocked') === 'true';
  
  // Si non configuré, montrer l'onboarding
  if (!isConfigured) {
    document.getElementById('activationScreen').style.display = 'none';
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.remove('visible');
    return;
  }
  
  // Si déjà activé, lancer normalement
  if (isActivatedFlag) {
    document.getElementById('activationScreen').style.display = 'none';
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.add('visible');
    enterApp();
    updateTrialUI(); // cachera barre et bouton
    return;
  }
  
  // Si bloqué par l'essai (3 saisies dépassées)
  if (isTrialBlocked || state.entries.length >= TRIAL_LIMIT) {
    document.getElementById('app').classList.remove('visible');
    document.getElementById('onboarding').classList.add('hidden');
    showActivationScreenFromTrial();
    return;
  }
  
  // Sinon, mode essai normal
  document.getElementById('activationScreen').style.display = 'none';
  document.getElementById('onboarding').classList.add('hidden');
  document.getElementById('app').classList.add('visible');
  enterApp();
  
  setTimeout(() => {
    if (typeof updateTrialUI === 'function') updateTrialUI();
  }, 100);
  
  if (!isConfigured) {
    document.getElementById('activationScreen').style.display = 'none';
    document.getElementById('app').classList.remove('visible');
    document.getElementById('onboarding').classList.remove('hidden');
    return;
  }
  
  document.getElementById('activationScreen').style.display = 'none';
  document.getElementById('onboarding').classList.add('hidden');
  enterApp();
  
  // Restaurer les filtres
  if (state.filters) {
    document.getElementById('filterCampaign').value = state.filters.campaign || '';
    document.getElementById('filterDateFrom').value = state.filters.dateFrom || '';
    document.getElementById('filterDateTo').value = state.filters.dateTo || '';
    if (state.filters.campaign || state.filters.dateFrom || state.filters.dateTo) {
      document.getElementById('filterResetBtn').style.display = 'flex';
      document.getElementById('filterBadge').style.display = 'flex';
    }
  }
  
  // 7. Event listeners
  document.getElementById('alertDelivery').addEventListener('change', saveSettings);
  document.getElementById('s_rate').addEventListener('input', runSim);
  document.getElementById('s_buy').addEventListener('input', calculateSuggestedPrice);
  document.getElementById('s_sell').addEventListener('input', calculateSuggestedPrice);
  document.getElementById('s_margin').addEventListener('input', calculateSuggestedPrice);
  document.getElementById('s_ship_unit').addEventListener('input', calculateSuggestedPrice);
  calculateSuggestedPrice();
  
  if (state.secondaryCurrency) {
    document.getElementById('exchangeRateRow').style.display = 'flex';
    document.getElementById('settingsSecondaryCurrencyLabel').textContent = state.secondaryCurrency;
    document.getElementById('settingsSecondaryCurrencyLabel2').textContent = state.secondaryCurrency;
    document.getElementById('settingsMainCurrencyLabel').textContent = state.currency;
  }
  
  // 8. Initialiser les systèmes
  initAutoSync();
  initCrossTabSync();
  initVisibilitySync();
  initNotifications();
}
  
  function resetAppFlow() {
  localStorage.removeItem('noki_activated');
  localStorage.removeItem(SK_CONFIGURED);
  localStorage.removeItem(SK);
  localStorage.removeItem('noki_stock');
  localStorage.removeItem('noki_device_id');
  localStorage.removeItem('noki_integrity');
  location.reload();
}

  // Initialiser l'autosync
  initAutoSync();
  initCrossTabSync();
  initVisibilitySync();
  
  // Initialiser les notifications
  initNotifications();
}
// Fonction pour générer et partager le rapport sur WhatsApp
function nokiSharePerformance() {
  // Ouvrir une modale de sélection de période
  openWhatsappPeriodModal();
}

function openWhatsappPeriodModal() {
  // Créer une modale simple pour sélectionner la période
  const overlay = document.createElement('div');
  overlay.id = 'whatsappPeriodOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
  
  overlay.innerHTML = `
    <div style="background:var(--surface);border-radius:20px;padding:28px 24px;width:400px;max-width:90vw;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-family:var(--font-d);font-size:18px;font-weight:800;color:var(--ink);margin-bottom:6px">📊 Rapport WhatsApp</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:20px">Choisissez la période à inclure dans le rapport</div>
      
      <div class="whatsapp-period-option selected" data-period="today" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(39,85,230,.1);border:2px solid var(--accent);border-radius:12px;cursor:pointer;margin-bottom:8px;color:var(--ink);transition:all .15s" onclick="selectWhatsappPeriod('today', this)">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--accent);background:var(--accent);box-shadow:inset 0 0 0 3px var(--surface);flex-shrink:0"></div>
        <span style="font-weight:600;font-size:13px;flex:1">Aujourd'hui</span>
      </div>
      
      <div class="whatsapp-period-option" data-period="yesterday" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surf-2);border:2px solid var(--border);border-radius:12px;cursor:pointer;margin-bottom:8px;color:var(--ink);transition:all .15s" onclick="selectWhatsappPeriod('yesterday', this)">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0"></div>
        <span style="font-weight:600;font-size:13px;flex:1">Hier</span>
      </div>
      
      <div class="whatsapp-period-option" data-period="7days" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surf-2);border:2px solid var(--border);border-radius:12px;cursor:pointer;margin-bottom:8px;color:var(--ink);transition:all .15s" onclick="selectWhatsappPeriod('7days', this)">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0"></div>
        <span style="font-weight:600;font-size:13px;flex:1">7 derniers jours</span>
      </div>
      
      <div class="whatsapp-period-option" data-period="30days" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surf-2);border:2px solid var(--border);border-radius:12px;cursor:pointer;margin-bottom:8px;color:var(--ink);transition:all .15s" onclick="selectWhatsappPeriod('30days', this)">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0"></div>
        <span style="font-weight:600;font-size:13px;flex:1">30 derniers jours</span>
      </div>
      
      <div class="whatsapp-period-option" data-period="custom" style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surf-2);border:2px solid var(--border);border-radius:12px;cursor:pointer;margin-bottom:8px;color:var(--ink);transition:all .15s" onclick="selectWhatsappPeriod('custom', this)">
        <div style="width:18px;height:18px;border-radius:50%;border:2px solid var(--border);flex-shrink:0"></div>
        <span style="font-weight:600;font-size:13px;flex:1">Période personnalisée</span>
      </div>
      
      <div id="whatsappCustomDateRow" style="display:none;gap:10px;align-items:center;margin-top:8px;margin-bottom:16px">
        <input type="date" id="whatsappDateFrom" style="flex:1;background:var(--surf-2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--ink);outline:none;font-family:var(--font)" onchange="updateWhatsappCustomDates()">
        <span style="color:var(--muted);font-size:13px">→</span>
        <input type="date" id="whatsappDateTo" style="flex:1;background:var(--surf-2);border:1px solid var(--border);border-radius:10px;padding:10px 13px;font-size:13px;color:var(--ink);outline:none;font-family:var(--font)" onchange="updateWhatsappCustomDates()">
      </div>
      
      <div style="display:flex;gap:8px">
        <button onclick="document.getElementById('whatsappPeriodOverlay').remove()" style="flex:1;padding:10px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;background:var(--surf-2);border:1px solid var(--border);color:var(--ink);font-family:var(--font)">Annuler</button>
        <button onclick="generateWhatsappReport()" style="flex:1;padding:10px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;background:var(--accent-g);border:none;color:#fff;font-family:var(--font)">📱 Partager</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Fermer en cliquant en dehors
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function selectWhatsappPeriod(period, element) {
  whatsappPeriod = period;
  
  // Mettre à jour les styles des options
  document.querySelectorAll('.whatsapp-period-option').forEach(opt => {
    opt.style.background = 'var(--surf-2)';
    opt.style.border = '2px solid var(--border)';
    const radio = opt.querySelector('div');
    if (radio) {
      radio.style.border = '2px solid var(--border)';
      radio.style.background = 'transparent';
      radio.style.boxShadow = 'none';
    }
    opt.classList.remove('selected');
  });
  
  element.style.background = 'rgba(39,85,230,.1)';
  element.style.border = '2px solid var(--accent)';
  element.classList.add('selected');
  const radio = element.querySelector('div');
  if (radio) {
    radio.style.border = '2px solid var(--accent)';
    radio.style.background = 'var(--accent)';
    radio.style.boxShadow = 'inset 0 0 0 3px var(--surface)';
  }
  
  // Afficher/masquer les dates personnalisées
  const customRow = document.getElementById('whatsappCustomDateRow');
  if (customRow) {
    customRow.style.display = period === 'custom' ? 'flex' : 'none';
  }
}

function updateWhatsappCustomDates() {
  whatsappCustomFrom = document.getElementById('whatsappDateFrom')?.value || '';
  whatsappCustomTo = document.getElementById('whatsappDateTo')?.value || '';
}

function getWhatsappFilteredEntries() {
  const now = new Date();
  let from, to;
  
  switch(whatsappPeriod) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      const y = new Date(now); y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59);
      break;
    case '7days':
      from = new Date(now); from.setDate(from.getDate() - 7);
      to = now;
      break;
    case '30days':
      from = new Date(now); from.setDate(from.getDate() - 30);
      to = now;
      break;
    case 'custom':
      from = whatsappCustomFrom ? new Date(whatsappCustomFrom) : new Date(0);
      to = whatsappCustomTo ? new Date(whatsappCustomTo + 'T23:59:59') : now;
      break;
    default:
      from = new Date(0);
      to = now;
  }
  
  return state.entries.filter(e => {
    const d = new Date(e.dateISO);
    return d >= from && d <= to;
  }).map(computeEntry);
}

function generateWhatsappReport() {
  const brandName = state.brand || "Ma Boutique";
  const entries = getWhatsappFilteredEntries();
  
  // Fermer la modale
  const overlay = document.getElementById('whatsappPeriodOverlay');
  if (overlay) overlay.remove();
  
  // Libellé de la période
  const periodLabels = {
    'today': "Aujourd'hui",
    'yesterday': 'Hier',
    '7days': '7 derniers jours',
    '30days': '30 derniers jours',
    'custom': whatsappCustomFrom && whatsappCustomTo ? `${whatsappCustomFrom} → ${whatsappCustomTo}` : 'Période personnalisée'
  };
  const periodLabel = periodLabels[whatsappPeriod] || 'Période sélectionnée';
  
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  if (entries.length === 0) {
    const message = `👑 CEO REPORT — NOKIMETRICS\n━━━━━━━━━━━━━━━\n📅 ${dateStr}\n📆 Période : ${periodLabel}\n\n⚠️ Aucune donnée pour cette période\n\n━━━━━━━━━━━━━━━\nPowered by NokiMetrics`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    return;
  }
  
  // Agréger les données
  const agg = entries.reduce((a, e) => {
    a.rev += e.revenue;
    a.net += e.netProfit;
    a.spend += e.spend;
    a.orders += +e.orders || 0;
    a.del += e.effectiveDelivered;
    a.cost += e.totalCost;
    return a;
  }, { rev: 0, net: 0, spend: 0, orders: 0, del: 0, cost: 0 });
  
  const deliveryRate = agg.orders > 0 ? Math.round((agg.del / agg.orders) * 100) : 0;
  const cpa = agg.orders > 0 ? Math.round(agg.spend / agg.orders) : 0;
  const roas = agg.spend > 0 ? Math.round((agg.rev / agg.spend) * 10) / 10 : 0;
  
  const statusEmoji = agg.net >= 0 ? '🟢' : '🔴';
  const statusText = agg.net >= 0 ? 'PROFITABLE' : 'EN PERTE';
  
  // Produit dominant
  const productSales = {};
  entries.forEach(e => {
    const name = e.campaign || 'Sans nom';
    productSales[name] = (productSales[name] || 0) + (+e.orders || 0);
  });
  const topProduct = Object.entries(productSales).sort((a, b) => b[1] - a[1])[0];
  
  // Stock data
  const stockData = getStockData();
  const lowStock = stockData.products.filter(p => p.qty <= p.alert && p.qty > 0);
  
  // Points critiques
  const criticalPoints = [];
  if (lowStock.length > 0) {
    criticalPoints.push(`• Stock faible : ${lowStock.map(p => p.name).join(', ')}`);
  }
  if (deliveryRate < state.alertDelivery) {
    criticalPoints.push(`• Taux livraison critique : ${deliveryRate}%`);
  }
  if (criticalPoints.length === 0) {
    criticalPoints.push('✅ Aucun point critique détecté');
  }
  
  // Recommandation
  const intel = computeIntelligence(entries);
  let recommandation = 'Continuez à monitorer vos KPIs.';
  if (intel) {
    if (intel.signal === 'red') recommandation = '⚠️ Suspendez les campagnes déficitaires.';
    else if (intel.signal === 'amber') recommandation = '⚡ Optimisez votre taux de livraison et CPA.';
    else if (intel.signal === 'green') recommandation = '🚀 Augmentez votre budget de 15-20%.';
  }
  
  // Priorités
  const priorities = [];
  if (lowStock.length > 0) {
    priorities.push(`1. Réapprovisionnement : ${lowStock.map(p => p.name).join(', ')}`);
  } else {
    priorities.push('1. Stock OK — Vérifier les prévisions');
  }
  if (deliveryRate < 70) {
    priorities.push('2. Améliorer le taux de livraison');
  } else {
    priorities.push('2. Optimisation budget ads');
  }
  if (topProduct) {
    priorities.push(`3. Scaling : ${topProduct[0]} (${topProduct[1]} ventes)`);
  } else {
    priorities.push('3. Identifier un produit à scaler');
  }
  priorities.push(`4. ${recommandation}`);
  
  const message = `👑 CEO REPORT — NOKIMETRICS
━━━━━━━━━━━━━━━
📅 ${dateStr}
📆 Période : ${periodLabel}

${statusEmoji} Business Status : ${statusText}

💰 Performance Financière
• Revenue : ${fmt(agg.rev)}
• Net Profit : ${agg.net >= 0 ? '+' : ''}${fmt(agg.net)}
• ROAS : ${roas}
• CPA : ${fmt(cpa)}

📦 Performance COD
• Orders : ${agg.orders}
• Delivery Rate : ${deliveryRate}%

🔥 Produit Dominant
${topProduct ? topProduct[0] + ' — ' + topProduct[1] + ' ventes' : '— Aucun —'}

⚠️ Points critiques
${criticalPoints.slice(0, 3).join('\n')}

🎯 Priorités du Jour
${priorities.join('\n')}

━━━━━━━━━━━━━━━
Powered by NokiMetrics`;

  const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}
// ===================== BANNIÈRE PARTENAIRE =====================
let partnerBannerTimer = null;
let partnerBannerDismissed = false;

function showPartnerBanner() {
  if (partnerBannerDismissed) return;
  
  const banner = document.getElementById('partnerBanner');
  if (banner) {
    banner.classList.add('show');
  }
  
  // Masquer automatiquement après 8 secondes
  if (partnerBannerTimer) clearTimeout(partnerBannerTimer);
  partnerBannerTimer = setTimeout(() => {
    hidePartnerBanner();
  }, 8000);
}

function hidePartnerBanner() {
  const banner = document.getElementById('partnerBanner');
  if (banner) {
    banner.classList.remove('show');
  }
}

function closePartnerBanner() {
  partnerBannerDismissed = true;
  hidePartnerBanner();
  // Ne plus afficher pendant cette session
}

function openLindarkPartner() {
  window.open('https://lindarkvision.systeme.io/853726ea-01cd2ec6', '_blank');
  closePartnerBanner();
}

// Programme l'affichage de la bannière à intervalles aléatoires
function schedulePartnerBanner() {
  // Première apparition après 45 secondes
  setTimeout(() => {
    showPartnerBanner();
    // Puis toutes les 3 à 5 minutes
    setInterval(() => {
      showPartnerBanner();
    }, 3600000 + Math.random() * 7200000); // Entre 3 et 5 minutes
  }, 10800000);
}
// ===================== GESTION DE STOCK =====================
// ===================== SYSTÈME DE NOTIFICATIONS PWA =====================
let notificationTimers = [];
let lastCPACheck = null;
let lastStockCheck = null;
let eveningReportSent = false;

// Fonction utilitaire pour envoyer des notifications via le Service Worker
async function sendNokiNotification(title, options = {}) {
  if (Notification.permission !== 'granted') return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      ...options
    });
  } catch(e) {
    console.log('Erreur notification:', e);
  }
}

// Demander la permission
function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('🔕 Notifications non supportées');
    return;
  }
  if (Notification.permission === 'granted') return;
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('🔔 Notifications activées');
      }
    });
  }
}

// 1. Alerte de Rupture de Stock
async function checkStockAlerts() {
  const data = getStockData();
  const products = data.products;
  
  // Éviter les doublons en vérifiant si on a déjà alerté récemment
  const now = Date.now();
  if (lastStockCheck && (now - lastStockCheck) < 60 * 60 * 1000) return; // Max 1 fois par heure
  lastStockCheck = now;
  
  for (const p of products) {
    if (p.qty <= p.alert && p.qty > 0) {
      await sendNokiNotification('📦 Alerte Réapprovisionnement !', {
        body: `Le produit "${p.name}" est presque épuisé (${p.qty} restant(s)). Prévoyez votre commande pour éviter une coupure de vos publicités.`,
        tag: 'stock-alert-' + p.id,
        data: { url: '/' }
      });
      // Petit délai entre les notifications multiples
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// 2. Rapport de Clôture (21h00)
function scheduleEveningReport() {
  // Vérifier toutes les 30 secondes
  const timer = setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Déclencher à 21h00
    if (hours === 21 && minutes === 0 && !eveningReportSent) {
      eveningReportSent = true;
      await sendEveningReport();
    }
    
    // Réinitialiser le flag après 21h05
    if (hours === 21 && minutes >= 5) {
      eveningReportSent = false;
    }
  }, 30000);
  
  notificationTimers.push(timer);
}

async function sendEveningReport() {
  const entries = state.entries.map(computeEntry);
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.dateISO === today);
  
  if (todayEntries.length === 0) {
    await sendNokiNotification('📊 Bilan de votre journée', {
      body: 'Aucune saisie enregistrée aujourd\'hui. Pensez à renseigner vos performances !',
      tag: 'evening-report',
      data: { url: '/' }
    });
    return;
  }
  
  const agg = todayEntries.reduce((a, e) => {
    a.net += e.netProfit;
    a.orders += +e.orders || 0;
    a.del += e.effectiveDelivered;
    a.spend += e.spend;
    a.cost += e.totalCost;
    a.rev += e.revenue;
    return a;
  }, { net: 0, orders: 0, del: 0, spend: 0, cost: 0, rev: 0 });
  
  const roi = agg.cost > 0 ? Math.round((agg.net / agg.cost) * 100) : 0;
  const delivery = agg.orders > 0 ? Math.round((agg.del / agg.orders) * 100) : 0;
  const cpa = agg.orders > 0 ? Math.round(agg.spend / agg.orders) : 0;
  
  await sendNokiNotification('📊 Bilan de votre journée', {
    body: `${agg.orders} cmd | ${agg.del} livrés (${delivery}%)\nProfit Net: ${fmt(agg.net)} | ROI: ${roi}%\nCPA: ${fmt(cpa)}\nCliquez pour voir le détail complet.`,
    tag: 'evening-report',
    data: { url: '/' }
  });
}

// 3. Garde-Fou de Rentabilité (CPA anormal)
async function checkCPAAnomaly() {
  const entries = state.entries.map(computeEntry);
  if (entries.length < 2) return;
  
  const now = Date.now();
  if (lastCPACheck && (now - lastCPACheck) < 30 * 60 * 1000) return; // Max 1 fois par 30 min
  lastCPACheck = now;
  
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = entries.filter(e => e.dateISO === today);
  const historicalEntries = entries.filter(e => e.dateISO !== today);
  
  if (todayEntries.length === 0 || historicalEntries.length === 0) return;
  
  // CPA moyen historique (moyenne des CPA de chaque entrée)
  const historicalCPAs = historicalEntries.map(e => e.cpaReal).filter(cpa => cpa > 0);
  if (historicalCPAs.length === 0) return;
  
  const avgHistoricalCPA = historicalCPAs.reduce((s, cpa) => s + cpa, 0) / historicalCPAs.length;
  
  // CPA du jour
  const todayAgg = todayEntries.reduce((a, e) => {
    a.spend += e.spend;
    a.orders += +e.orders || 0;
    return a;
  }, { spend: 0, orders: 0 });
  
  const todayCPA = todayAgg.orders > 0 ? todayAgg.spend / todayAgg.orders : 0;
  
  // Si le CPA du jour dépasse de 20% le CPA moyen historique
  if (avgHistoricalCPA > 0 && todayCPA > avgHistoricalCPA * 1.2) {
    const increase = Math.round(((todayCPA / avgHistoricalCPA) - 1) * 100);
    await sendNokiNotification('📉 Anomalie de CPA détectée', {
      body: `CPA aujourd'hui: ${fmt(todayCPA)} (hausse de ${increase}%).\nMoyenne habituelle: ${fmt(avgHistoricalCPA)}.\nVérifiez vos campagnes pour protéger votre budget.`,
      tag: 'cpa-warning',
      data: { url: '/' }
    });
  }
}

// Initialiser le système de notifications
function initNotifications() {
  if (!('serviceWorker' in navigator)) return;
  
  // Demander la permission après un délai
  setTimeout(() => {
    requestNotificationPermission();
  }, 5000);
  
  // Lancer les vérifications
  scheduleEveningReport();
  
  // Vérifier le stock toutes les 2 heures
  const stockTimer = setInterval(() => checkStockAlerts(), 2 * 60 * 60 * 1000);
  notificationTimers.push(stockTimer);
  
  // Vérifier le CPA toutes les heures
  const cpaTimer = setInterval(() => checkCPAAnomaly(), 60 * 60 * 1000);
  notificationTimers.push(cpaTimer);
  
  // Première vérification après 60 secondes
  setTimeout(() => {
    checkStockAlerts();
    checkCPAAnomaly();
  }, 60000);
  
  console.log('🔔 Système de notifications PWA initialisé');
}

// Nettoyer les timers si nécessaire
function clearAllNotifications() {
  notificationTimers.forEach(timer => clearInterval(timer));
  notificationTimers = [];
}
// ===================== SYSTÈME D'AUTOSYNC =====================
let autoSyncInterval = null;
let lastSyncTimestamp = null;
let isDataStale = false;

function initAutoSync() {
  // Vérifier les changements toutes les 10 secondes
  autoSyncInterval = setInterval(() => {
    checkForDataChanges();
  }, 10000);
  
  console.log('🔄 AutoSync initialisé — vérification toutes les 10s');
}

function checkForDataChanges() {
  const currentEntries = JSON.stringify(state.entries);
  const currentStock = localStorage.getItem('noki_stock');
  const currentSettings = JSON.stringify({
    currency: state.currency,
    brand: state.brand,
    alertDelivery: state.alertDelivery,
    alertRoi: state.alertRoi,
    theme: state.theme
  });
  
  // Vérifier si les données ont changé
  const lastHash = sessionStorage.getItem('noki_data_hash');
  const newHash = btoa(currentEntries + currentStock + currentSettings);
  
  if (lastHash !== newHash) {
    sessionStorage.setItem('noki_data_hash', newHash);
    
    // Recharger l'état depuis le localStorage
    loadState();
    
    // Mettre à jour l'UI
    updateDashboard();
    updateAnalytics();
    
    // Mettre à jour le stock si le panneau est ouvert
    if (document.getElementById('stockOverlay').classList.contains('open')) {
      updateStockDashboard();
      updateStockPerformance();
    }
    
    lastSyncTimestamp = new Date();
    isDataStale = false;
  }
}

// Synchronisation inter-onglets
function initCrossTabSync() {
  window.addEventListener('storage', function(e) {
    // Détecter les changements dans le localStorage (depuis un autre onglet)
    if (e.key === SK || e.key === 'noki_stock' || e.key === 'noki_integrity') {
      // Recharger l'état
      loadState();
      
      // Mettre à jour l'UI
      updateDashboard();
      updateAnalytics();
      runSim();
      
      // Mettre à jour le stock si ouvert
      if (document.getElementById('stockOverlay')?.classList.contains('open')) {
        updateStockDashboard();
        updateStockPerformance();
      }
      
      showToast('🔄 Données synchronisées');
    }
  });
}

// Synchronisation au retour de l'application (PWA)
function initVisibilitySync() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // L'utilisateur revient sur l'application
      const timeSinceLastSync = lastSyncTimestamp ? (new Date() - lastSyncTimestamp) : Infinity;
      
      // Si plus de 30 secondes depuis la dernière synchro
      if (timeSinceLastSync > 30000 || isDataStale) {
        loadState();
        updateDashboard();
        updateAnalytics();
        runSim();
        
        if (document.getElementById('stockOverlay')?.classList.contains('open')) {
          updateStockDashboard();
          updateStockPerformance();
        }
        
        isDataStale = false;
        lastSyncTimestamp = new Date();
      }
    }
  });
}

// Marquer les données comme non synchronisées
function markDataStale() {
  isDataStale = true;
}

// Forcer une synchronisation immédiate
function forceSync() {
  loadState();
  updateDashboard();
  updateAnalytics();
  runSim();
  
  if (document.getElementById('stockOverlay')?.classList.contains('open')) {
    updateStockDashboard();
    updateStockPerformance();
  }
  
  lastSyncTimestamp = new Date();
  isDataStale = false;
}

function getStockData() {
  try {
    const raw = localStorage.getItem('noki_stock');
    return raw ? JSON.parse(raw) : { products: [], movements: [] };
  } catch(e) { return { products: [], movements: [] }; }
}

function saveStockData(data) {
  if (!checkLocalStorage()) {
    showLocalStorageWarning();
    return;
  }
  try {
    localStorage.setItem('noki_stock', JSON.stringify(data));
    // Mettre à jour l'intégrité
    localStorage.setItem('noki_integrity', generateIntegrityHash());
    // Déclencher la synchro
    markDataStale();
    lastSyncTimestamp = new Date();
  } catch(e) {
    showLocalStorageWarning();
  }
}

function openStock() {
  document.getElementById('stockOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  updateStockDashboard();
  // Mettre à jour les performances automatiquement
  setTimeout(() => updateStockPerformance(), 300);
}

function closeStock() {
  document.getElementById('stockOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function stockAddProduct() {
  const name = document.getElementById('stockProdName').value.trim();
  const buy = +document.getElementById('stockProdBuy').value || 0;
  const sell = +document.getElementById('stockProdSell').value || 0;
  const qty = +document.getElementById('stockProdQty').value || 1;
  const alert = +document.getElementById('stockProdAlert').value || 5;

  if (!name || buy <= 0 || sell <= 0) {
    showToast('Remplissez le nom, prix d\'achat et prix de vente');
    return;
  }

  const data = getStockData();
  const existing = data.products.find(p => p.name.toLowerCase() === name.toLowerCase());
  
  if (existing) {
    existing.qty += qty;
    existing.buy = buy;
    existing.sell = sell;
    existing.alert = alert;
  } else {
    data.products.push({
      id: Date.now(),
      name,
      buy,
      sell,
      qty,
      alert
    });
  }

  // Ajouter un mouvement d'entrée
  data.movements.unshift({
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    product: name,
    type: 'in',
    qty: qty,
    reason: 'Ajout initial / Réapprovisionnement'
  });

  saveStockData(data);
  updateStockDashboard();

  // Vider les champs
  document.getElementById('stockProdName').value = '';
  document.getElementById('stockProdBuy').value = '';
  document.getElementById('stockProdSell').value = '';
  document.getElementById('stockProdQty').value = '1';
  document.getElementById('stockProdAlert').value = '5';

  showToast('Produit ajouté au stock');
}

function stockMove(productId, type, qty, reason) {
  const data = getStockData();
  const product = data.products.find(p => p.id === productId);
  if (!product) return;

  if (type === 'out') {
    if (product.qty < qty) {
      showToast('Stock insuffisant');
      return;
    }
    product.qty -= qty;
  } else {
    product.qty += qty;
  }

  data.movements.unshift({
    id: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    product: product.name,
    type: type,
    qty: qty,
    reason: reason
  });

  saveStockData(data);
  updateStockDashboard();
  showToast(type === 'in' ? 'Entrée enregistrée' : 'Sortie enregistrée');
}

function stockDeleteProduct(productId) {
  if (!confirm('Supprimer ce produit du stock ?')) return;
  const data = getStockData();
  data.products = data.products.filter(p => p.id !== productId);
  saveStockData(data);
  updateStockDashboard();
  showToast('Produit supprimé');
}

function updateStockDashboard() {
  // 🔄 FORCER LE RAFFRAÎCHISSEMENT DE L'ÉTAT DEPUIS LE LOCALSTORAGE
  loadState();
  
  const data = getStockData();
  const products = data.products;
  const movements = data.movements;

  // KPIs
  const totalProducts = products.length;
  const totalValue = products.reduce((s, p) => s + (p.qty * p.buy), 0);
  const alertsCount = products.filter(p => p.qty <= p.alert).length;
  
  const today = new Date().toISOString().slice(0, 10);
  const todayMoves = movements.filter(m => m.date === today).length;

  document.getElementById('stockKpiProducts').textContent = totalProducts;
  document.getElementById('stockKpiValue').textContent = fmt(totalValue);
  document.getElementById('stockKpiValue').style.fontSize = '22px';
  document.getElementById('stockKpiAlerts').textContent = alertsCount;
  document.getElementById('stockKpiMoves').textContent = todayMoves;
  
  // Rendre les cartes KPI cliquables avec redirection vers la section produits
  const kpiCards = document.querySelectorAll('.stock-kpi-card');
  if (kpiCards.length >= 4) {
    // Total Produits → scroll vers la liste des produits
    kpiCards[0].style.cursor = 'pointer';
    kpiCards[0].onclick = function() {
      document.querySelector('.stock-section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Valeur du Stock → scroll vers la liste des produits
    kpiCards[1].style.cursor = 'pointer';
    kpiCards[1].onclick = function() {
      document.querySelector('.stock-section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Produits en Alerte → scroll vers les produits en alerte
    kpiCards[2].style.cursor = 'pointer';
    kpiCards[2].onclick = function() {
      const firstAlert = document.querySelector('.stock-alert-row');
      if (firstAlert) {
        firstAlert.scrollIntoView({ behavior: 'smooth' });
      } else {
        document.querySelector('.stock-section:nth-of-type(3)')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Mouvements → scroll vers l'historique
    kpiCards[3].style.cursor = 'pointer';
    kpiCards[3].onclick = function() {
      document.querySelector('.stock-section:last-of-type')?.scrollIntoView({ behavior: 'smooth' });
    };
  }
// Afficher la valeur en devise secondaire si configurée
const secondaryDiv = document.getElementById('stockKpiValueSecondary');

// 🔧 FORCER LE REINITIALISATION DES PARAMÈTRES DEPUIS LE LOCALSTORAGE
try {
  const savedState = localStorage.getItem(SK);
  if (savedState) {
    const parsed = JSON.parse(savedState);
    if (parsed.secondaryCurrency !== undefined) state.secondaryCurrency = parsed.secondaryCurrency;
    if (parsed.exchangeRate !== undefined) state.exchangeRate = parsed.exchangeRate;
  }
} catch(e) {}

// Calcul correct de la valeur en devise secondaire
if (state.secondaryCurrency && state.secondaryCurrency !== '' && state.exchangeRate > 0 && totalValue > 0) {
  const secondaryValue = totalValue / state.exchangeRate;
  secondaryDiv.style.display = 'block';
  secondaryDiv.innerHTML = '≈ ' + Math.round(secondaryValue).toLocaleString('fr-FR') + ' ' + state.secondaryCurrency;
  
  // Log de confirmation
  console.log('✅ Stock - Valeur secondaire affichée:', Math.round(secondaryValue), state.secondaryCurrency);
} else {
  secondaryDiv.style.display = 'none';
  if (state.secondaryCurrency && state.exchangeRate > 0 && totalValue === 0) {
    console.log('ℹ️ Stock - totalValue est 0, pas d\'affichage secondaire');
  } else if (!state.secondaryCurrency) {
    console.log('ℹ️ Stock - Aucune devise secondaire configurée');
  } else if (state.exchangeRate <= 0) {
    console.log('ℹ️ Stock - Taux de change invalide (0 ou non défini)');
  }
}
  // Tableau produits — trié par quantité croissante
  const tbody = document.getElementById('stockTableBody');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="stock-empty">Aucun produit enregistré</td></tr>';
  } else {
    // Trier par quantité croissante (les plus bas d'abord)
    const sortedProducts = [...products].sort((a, b) => a.qty - b.qty);
    
    tbody.innerHTML = sortedProducts.map(p => {
      const ratio = p.alert > 0 ? p.qty / p.alert : 999;
      
      // Déterminer le code couleur et l'emoji
      let colorStyle = '';
      let emoji = '';
      let rowClass = '';
      
      if (p.qty <= 0) {
        colorStyle = 'background:rgba(220,38,38,0.15);border-left:3px solid #dc2626';
        emoji = '🔴';
        rowClass = 'stock-alert-row';
      } else if (ratio <= 0.5) {
        colorStyle = 'background:rgba(220,38,38,0.08);border-left:3px solid #dc2626';
        emoji = '🟥';
        rowClass = 'stock-alert-row';
      } else if (ratio <= 1) {
        colorStyle = 'background:rgba(245,158,11,0.08);border-left:3px solid #f59e0b';
        emoji = '🟧';
        rowClass = 'stock-alert-row';
      } else if (ratio <= 1.5) {
        colorStyle = 'border-left:3px solid #f59e0b';
        emoji = '🟨';
        rowClass = '';
      } else if (ratio <= 3) {
        colorStyle = 'border-left:3px solid #059669';
        emoji = '🟩';
        rowClass = '';
      } else {
        colorStyle = 'border-left:3px solid #2755e6';
        emoji = '🟦';
        rowClass = '';
      }
      
      const valueStyle = p.qty <= p.alert ? 'color:var(--red);font-weight:700' : '';
      const alertStatus = p.qty <= 0 ? '⚠️ RUPTURE' : (p.qty <= p.alert ? '⚠️ BAS' : '✅ OK');
      const alertColor = p.qty <= 0 ? 'color:#dc2626;font-weight:700' : (p.qty <= p.alert ? 'color:var(--red);font-weight:700' : 'color:var(--green)');
      
      return `
        <tr class="${rowClass}" style="${colorStyle}">
          <td style="font-weight:600">${emoji} ${p.name}</td>
          <td>${fmt(p.buy)}</td>
          <td>${fmt(p.sell)}</td>
          <td style="${valueStyle}">${p.qty} <span style="font-size:10px;color:var(--muted)">/ seuil: ${p.alert}</span></td>
          <td>${fmt(p.qty * p.buy)}</td>
          <td style="${alertColor}">${alertStatus}</td>
          <td>
            <button class="stock-btn stock-btn-outline" onclick="stockQuickMove(${p.id}, 'in')" title="Entrée" style="padding:4px 8px;font-size:10px;margin-right:4px">+</button>
            <button class="stock-btn stock-btn-outline" onclick="stockQuickMove(${p.id}, 'out')" title="Sortie" style="padding:4px 8px;font-size:10px;margin-right:4px;color:var(--red);border-color:var(--red)">−</button>
            <button class="stock-btn stock-btn-outline" onclick="stockDeleteProduct(${p.id})" title="Supprimer" style="padding:4px 8px;font-size:10px">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Historique
  const histBody = document.getElementById('stockHistoryBody');
  if (movements.length === 0) {
    histBody.innerHTML = '<tr><td colspan="5" class="stock-empty">Aucun mouvement</td></tr>';
  } else {
    histBody.innerHTML = movements.slice(0, 20).map(m => `
      <tr>
        <td>${m.date.split('-').reverse().join('/')}</td>
        <td>${m.product}</td>
        <td><span class="stock-badge ${m.type === 'in' ? 'in' : 'out'}">${m.type === 'in' ? 'Entrée' : 'Sortie'}</span></td>
        <td>${m.qty}</td>
        <td style="font-size:11px;color:var(--muted)">${m.reason}</td>
      </tr>
    `).join('');
  }
}

function stockQuickMove(productId, type) {
  const qty = prompt(type === 'in' ? 'Quantité à ajouter :' : 'Quantité à retirer :', '1');
  if (!qty || isNaN(qty) || +qty <= 0) return;
  const reason = prompt('Motif (ex: Vente, Réappro, Perte...) :', type === 'in' ? 'Réapprovisionnement' : 'Vente');
  if (!reason) return;
  stockMove(productId, type, +qty, reason);
}
function updateStockPerformance() {
  const container = document.getElementById('stockPerformanceContent');
  const entries = state.entries.map(computeEntry);
  const stockData = getStockData();
  const products = stockData.products;
  
  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:8px">📭</div>
        <div style="font-size:13px">Aucune saisie de campagne enregistrée.<br>Ajoutez des données pour voir les performances.</div>
      </div>`;
    return;
  }
  
  if (products.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;color:var(--muted)">
        <div style="font-size:36px;margin-bottom:8px">📦</div>
        <div style="font-size:13px">Aucun produit en stock.<br>Ajoutez des produits pour voir leurs performances.</div>
      </div>`;
    return;
  }
  
  // Calculer les performances par produit
  const productPerformance = {};
  
  entries.forEach(e => {
    const productName = e.campaign; // Le nom de la campagne correspond au produit
    if (!productPerformance[productName]) {
      productPerformance[productName] = {
        totalOrders: 0,
        totalDelivered: 0,
        totalRevenue: 0,
        totalSpend: 0,
        totalProfit: 0,
        count: 0
      };
    }
    productPerformance[productName].totalOrders += +e.orders || 0;
    productPerformance[productName].totalDelivered += e.effectiveDelivered || 0;
    productPerformance[productName].totalRevenue += e.revenue || 0;
    productPerformance[productName].totalSpend += e.spend || 0;
    productPerformance[productName].totalProfit += e.netProfit || 0;
    productPerformance[productName].count++;
  });
  
  // Convertir en tableau et trier par profit
  const sorted = Object.entries(productPerformance)
    .sort((a, b) => b[1].totalProfit - a[1].totalProfit);
  
  const maxProfit = Math.max(...sorted.map(([, v]) => Math.abs(v.totalProfit)), 1);
  
  // Générer le contenu
  let html = `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:12px">
         Analyse basée sur <strong>${entries.length}</strong> saisies • ${products.length} produits en stock
      </div>
  `;
  
  // Résumé des meilleurs
  if (sorted.length > 0) {
    const best = sorted[0];
    html += `
      <div style="background:var(--green-bg);border:1px solid rgba(64,239,183,0.2);border-radius:12px;padding:14px 16px;margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px"> Produit le plus rentable</div>
        <div style="font-weight:700;font-size:15px;color:var(--ink)">${best[0]}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">
          Profit: <span style="color:var(--green);font-weight:700">${fmt(best[1].totalProfit)}</span> • 
          ${best[1].totalOrders} cmd • 
          ${best[1].totalDelivered} livrés • 
          ${best[1].count} saisies
        </div>
      </div>`;
  }
  
  // Barres de performance
  html += `<div style="display:flex;flex-direction:column;gap:8px">`;
  
  sorted.slice(0, 10).forEach(([name, perf]) => {
    const pct = Math.max(5, Math.round(Math.abs(perf.totalProfit) / maxProfit * 100));
    const isPositive = perf.totalProfit >= 0;
    const barColor = isPositive ? 'linear-gradient(90deg,#0fa37f,#06d6a0)' : 'linear-gradient(90deg,#d63b3b,#ef4444)';
    const deliveryRate = perf.totalOrders > 0 ? Math.round((perf.totalDelivered / perf.totalOrders) * 100) : 0;
    const cpa = perf.totalOrders > 0 ? Math.round(perf.totalSpend / perf.totalOrders) : 0;
    
    html += `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-weight:600;font-size:13px;color:var(--ink)">${name}</span>
          <span style="font-weight:700;font-family:var(--font-m);font-size:13px;color:${isPositive ? 'var(--green)' : 'var(--red)'}">${fmt(perf.totalProfit)}</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:6px">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:10px;transition:width .6s"></div>
        </div>
        <div style="display:flex;gap:16px;font-size:10px;color:var(--muted)">
          <span> ${perf.totalOrders} cmd</span>
          <span> ${perf.totalDelivered} livrés (${deliveryRate}%)</span>
          <span> CPA: ${fmt(cpa)}</span>
          <span> ${perf.count} saisies</span>
        </div>
      </div>`;
  });
  
  html += `</div></div>`;
  
  container.innerHTML = html;
}
// ===================== SUPPRESSION SÉLECTIVE DE L'HISTORIQUE =====================
let stockDeleteMode = null; // 'all', 'today', 'week', 'month', 'custom'
let stockDeleteCustomFrom = null;
let stockDeleteCustomTo = null;

function openStockDeleteModal(mode, customFrom, customTo) {
  stockDeleteMode = mode;
  stockDeleteCustomFrom = customFrom || null;
  stockDeleteCustomTo = customTo || null;
  
  const infoEl = document.getElementById('stockDeleteInfo');
  const messages = {
    'all': 'Vous allez supprimer <strong>tout</strong> l\'historique des mouvements.',
    'today': 'Vous allez supprimer l\'historique <strong>d\'aujourd\'hui</strong>.',
    'week': 'Vous allez supprimer l\'historique des <strong>7 derniers jours</strong>.',
    'month': 'Vous allez supprimer l\'historique des <strong>30 derniers jours</strong>.',
    'custom': `Vous allez supprimer l\'historique du <strong>${customFrom}</strong> au <strong>${customTo}</strong>.`
  };
  
  infoEl.innerHTML = (messages[mode] || messages['all']) + '<br>Saisissez le code PIN de sécurité pour confirmer.';
  
  document.getElementById('stockDeletePinInput').value = '';
  document.getElementById('stockDeleteError').textContent = '';
  document.getElementById('stockDeleteModalOverlay').classList.add('open');
  document.getElementById('stockDeletePinInput').focus();
}

function closeStockDeleteModal() {
  document.getElementById('stockDeleteModalOverlay').classList.remove('open');
  stockDeleteMode = null;
}

function confirmStockHistoryDelete() {
  const pin = document.getElementById('stockDeletePinInput').value.trim();
  const expectedPin = state.ceoPIN || '0000';
  
  if (pin !== expectedPin) {
    document.getElementById('stockDeleteError').textContent = '❌ Code PIN incorrect';
    document.getElementById('stockDeletePinInput').value = '';
    document.getElementById('stockDeletePinInput').focus();
    return;
  }
  
  // PIN correct — procéder à la suppression
  const data = getStockData();
  const today = new Date().toISOString().slice(0, 10);
  let filteredMovements;
  
  switch(stockDeleteMode) {
    case 'all':
      filteredMovements = [];
      break;
    case 'today':
      filteredMovements = data.movements.filter(m => m.date !== today);
      break;
    case 'week':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().slice(0, 10);
      filteredMovements = data.movements.filter(m => m.date < weekAgoStr);
      break;
    case 'month':
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthAgoStr = monthAgo.toISOString().slice(0, 10);
      filteredMovements = data.movements.filter(m => m.date < monthAgoStr);
      break;
    case 'custom':
      if (stockDeleteCustomFrom && stockDeleteCustomTo) {
        filteredMovements = data.movements.filter(m => 
          m.date < stockDeleteCustomFrom || m.date > stockDeleteCustomTo
        );
      } else {
        filteredMovements = data.movements;
      }
      break;
    default:
      filteredMovements = data.movements;
  }
  
  const deletedCount = data.movements.length - filteredMovements.length;
  data.movements = filteredMovements;
  saveStockData(data);
  updateStockDashboard();
  
  closeStockDeleteModal();
  showToast(`🗑️ ${deletedCount} mouvement(s) supprimé(s)`);
}
function openStockDeleteCustomRange() {
  const from = prompt('Date de début (AAAA-MM-JJ) :', '');
  if (!from) return;
  const to = prompt('Date de fin (AAAA-MM-JJ) :', '');
  if (!to) return;
  
  // Validation simple du format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    showToast('Format de date invalide. Utilisez AAAA-MM-JJ');
    return;
  }
  
  openStockDeleteModal('custom', from, to);
}

// Fermer la modale en cliquant en dehors
document.addEventListener('click', function(e) {
  const overlay = document.getElementById('stockDeleteModalOverlay');
  if (e.target === overlay) {
    closeStockDeleteModal();
  }
});

// Validation avec Enter
document.addEventListener('DOMContentLoaded', function() {
  const pinInput = document.getElementById('stockDeletePinInput');
  if (pinInput) {
    pinInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        confirmStockHistoryDelete();
      }
    });
  }
});
// Ajouter le bouton Stock dans la sidebar (desktop)
(function() {
  const sidebar = document.getElementById('sidebar');
  const stockBtn = document.createElement('button');
  stockBtn.className = 'nav-item';
  stockBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="18" height="18">
      <path d="M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z"/>
      <path d="M7 3v18M12 3v18M17 3v18" stroke-width="0.5" opacity="0.3"/>
    </svg>
     Gestion Stock
  `;
  stockBtn.onclick = openStock;
  
  const ceoBtn = sidebar.querySelector('[onclick="openCEOPin()"]');
  ceoBtn.parentNode.insertBefore(stockBtn, ceoBtn);
})();

// Ajouter le bouton Stock dans la bottom nav (mobile)
(function() {
  const bottomNav = document.getElementById('bottomNav');
  if (!bottomNav) return;
  
  const stockNavBtn = document.createElement('button');
  stockNavBtn.className = 'bottom-nav-btn';
  stockNavBtn.id = 'bnav_stock';
  stockNavBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="20" height="20">
      <path d="M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z"/>
    </svg>
    Stock
  `;
  stockNavBtn.onclick = openStock;
  bottomNav.appendChild(stockNavBtn);
})();
// ===================== IMPORT / EXPORT CSV =====================
window.exportAllDataToCSV = function() {
  try {
    // Récupération sécurisée des données
    const entries = state.entries || [];
    const stockData = getStockData() || { products: [], movements: [] };
    const charges = state.fixedCharges || [];
    
    let downloadCount = 0;

    // 1. Export des campagnes
    if (entries.length > 0) {
      let campaignsCSV = "id,date,campagne,spend,spend_currency,orders,delivered,confirmed,buy,buy_currency,sell,sell_currency,ship,ship_currency,call,call_currency,returns,other,other_currency\n";
      entries.forEach(e => {
        campaignsCSV += `${e.id},${e.dateISO},"${(e.campaign || '').replace(/"/g, '""')}",${e.spend || 0},${e.spendCurrency || 'main'},${e.orders || 0},${e.delivered || 0},${e.confirmed || 0},${e.buy || 0},${e.buyCurrency || 'main'},${e.sell || 0},${e.sellCurrency || 'main'},${e.ship || 0},${e.shipCurrency || 'main'},${e.call || 0},${e.callCurrency || 'main'},${e.returns || 0},${e.other || 0},${e.otherCurrency || 'main'}\n`;
      });
      downloadCSV(campaignsCSV, 'campagnes.csv');
      downloadCount++;
    }
    
    // 2. Export des produits (Stock)
    if (stockData.products && stockData.products.length > 0) {
      let productsCSV = "id,nom,prix_achat,prix_vente,quantite,seuil_alerte\n";
      stockData.products.forEach(p => {
        productsCSV += `${p.id},"${(p.name || '').replace(/"/g, '""')}",${p.buy || 0},${p.sell || 0},${p.qty || 0},${p.alert || 5}\n`;
      });
      downloadCSV(productsCSV, 'produits.csv');
      downloadCount++;
    }
    
    // 3. Export des mouvements (Stock)
    if (stockData.movements && stockData.movements.length > 0) {
      let movementsCSV = "id,date,produit,type,quantite,motif\n";
      stockData.movements.forEach(m => {
        movementsCSV += `${m.id},${m.date},"${(m.product || '').replace(/"/g, '""')}",${m.type},${m.qty},"${(m.reason || '').replace(/"/g, '""')}"\n`;
      });
      downloadCSV(movementsCSV, 'mouvements_stock.csv');
      downloadCount++;
    }
    
    // 4. Export des charges fixes
    if (charges.length > 0) {
      let chargesCSV = "libelle,montant\n";
      charges.forEach(c => {
        chargesCSV += `"${(c.label || '').replace(/"/g, '""')}",${c.amount || 0}\n`;
      });
      downloadCSV(chargesCSV, 'charges_fixes.csv');
      downloadCount++;
    }
    
    // Notification de succès ou avertissement
    if (downloadCount > 0) {
      showToast(`📁 Export terminé : ${downloadCount} fichier(s) CSV téléchargé(s)`);
    } else {
      showToast('⚠️ Aucune donnée à exporter (vos tableaux sont vides)');
    }
    
  } catch(err) {
    console.error("Erreur lors de l'export :", err);
    showToast('❌ Erreur lors de l\'export des données');
  }
};

// Fonction utilitaire pour lancer le téléchargement du fichier généré
function downloadCSV(content, filename) {
  const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ===================== IMPORT CSV =====================
// Cette fonction manquait dans ton code, elle permet au bouton de réagir.
window.importCSVData = function(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    
    // Note: Comme tu as 4 types d'exports CSV différents (campagnes, stock, etc.), 
    // l'import automatique nécessite de parser et de deviner de quel fichier il s'agit.
    // Pour l'instant, on active l'interface et on prévient l'utilisateur.
    console.log("Fichier CSV lu :", file.name);
    showToast(`⚠️ L'importation de fichiers CSV est en cours de développement.`);
    
    // Réinitialiser le champ input pour permettre de recliquer sur le même fichier plus tard
    input.value = '';
  };
  reader.readAsText(file);
};

// Lancement de l'application
init();
</script>
