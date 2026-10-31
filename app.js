/*
 * Le compte est bon — suivi des classes
 *
 * Application autonome : les données sont stockées dans le localStorage du
 * navigateur. L'export / import JSON permet de les sauvegarder ou de les
 * transférer sur un autre appareil.
 *
 * Modèle de données (schemaVersion 3) :
 * {
 *   schemaVersion: 3,
 *   settings: { timerSeconds, timerSound, lastExportAt },
 *   levels:  [{ id, name, numbers: [6 entiers], target, order, builtin }],
 *   classes: [{ id, name, completed: [levelId], history: [{ levelId, levelName, at }] }]
 * }
 *
 * Les niveaux sont toujours triés par `order` (champ explicite) : c'est lui, et
 * non l'identifiant, qui fixe l'ordre de progression.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constantes
  // ---------------------------------------------------------------------------

  // Nom historique de la clé, conservé pour retrouver les données existantes.
  const STORAGE_KEY = 'compte-est-bon-v1';
  const UNREADABLE_KEY = STORAGE_KEY + '-illisible';
  const SCHEMA_VERSION = 3;
  const EXPORT_APP_ID = 'compte-est-bon';

  const TIMER_CHOICES = [30, 45, 60, 90, 120, 180];
  const DEFAULT_TIMER_SECONDS = 60;
  const TIMER_WARNING_SECONDS = 10;
  const EXPORT_REMINDER_DAYS = 30;

  const BUILTIN_LEVELS = [
    ['n1', [25, 5, 3, 1, 2, 8], 399],
    ['n2', [50, 3, 7, 9, 8, 7], 578],
    ['n3', [25, 2, 5, 3, 10, 8], 980],
    ['n4', [100, 7, 2, 9, 3, 5], 737],
    ['n5', [50, 4, 3, 6, 10, 5], 606],
    ['n6', [100, 5, 4, 1, 3, 5], 111],
    ['n7', [25, 4, 6, 8, 8, 2], 268],
    ['n8', [100, 4, 6, 1, 1, 2], 998],
    ['n9', [50, 4, 6, 10, 3, 3], 316],
    ['n10', [100, 3, 9, 10, 5, 4], 700],
    ['n11', [10, 1, 2, 4, 9, 10], 609],
    ['n12', [2, 25, 50, 4, 5, 6], 129],
    ['n13', [75, 1, 7, 4, 7, 3], 524],
    ['n14', [75, 4, 9, 8, 5, 10], 602],
    ['n15', [50, 1, 4, 10, 8, 9], 443],
    ['n16', [100, 2, 75, 3, 1, 10], 888],
    ['n17', [100, 5, 6, 3, 1, 10], 635],
    ['n18', [50, 1, 9, 3, 2, 10], 446],
    ['n19', [75, 1, 9, 3, 100, 10], 312],
    ['n20', [25, 2, 75, 1, 100, 10], 262],
    ['n21', [50, 2, 6, 1, 9, 5], 263],
    ['n22', [75, 2, 10, 8, 1, 25], 731],
    ['n23', [100, 7, 50, 9, 3, 25], 991],
    ['n24', [25, 3, 4, 10, 6, 5], 689],
    ['n25', [50, 8, 4, 3, 7, 5], 181],
    ['n26', [75, 8, 1, 6, 7, 5], 325],
    ['n27', [50, 8, 10, 6, 7, 5], 372],
    ['n28', [100, 4, 4, 5, 4, 6], 918],
    ['n29', [75, 8, 4, 3, 2, 3], 122],
    ['n30', [100, 8, 4, 50, 1, 5], 798],
    ['n31', [100, 8, 10, 7, 2, 5], 290],
    ['n32', [50, 7, 10, 9, 6, 5], 967],
    ['n33', [75, 3, 2, 8, 4, 9], 571],
    ['n34', [75, 4, 2, 9, 10, 3], 782],
    ['n35', [100, 10, 2, 75, 8, 1], 148],
    ['n36', [100, 3, 8, 50, 4, 25], 848]
  ].map(([id, numbers, target]) => ({ id, name: 'Niveau ' + id.slice(1), numbers, target }));

  const SOLUTIONS = {
    n1: '3 × (2 − 1) × (25 × 5 + 8) = 399',
    n2: '50 × (3 + 9) − 7 − 8 − 7 = 578',
    n3: '5 × (2 + 25 × 8) − 3 × 10 = 980',
    n4: '(2 + 9) + 7 × (100 + 3) + 5 = 737',
    n5: '50 × (3 + 10) − 4 × (6 + 5) = 606',
    n6: '(100 + 5 + 4) × 1 − 3 + 5 = 111',
    n7: '25 × (4 + 6) + 8 + 8 + 2 = 268',
    n8: '100 × (4 + 6) + 1 − 1 − 2 = 998',
    n9: '4 × (6 × (50 − 10) − 3) ÷ 3 = 316',
    n10: '9 + 100 × (10 − 3) − 5 − 4 = 700',
    n11: '1 × 9 + 10 × (2 + 4) × 10 = 609',
    n12: '(50 − (2 + 25) + 4) × 5 − 6 = 129',
    n13: '(75 + 1) × 7 − 4 − 7 + 3 = 524',
    n14: '75 × 8 − (4 + 9) + 5 + 10 = 602',
    n15: '(50 × 1 − 4) × 10 − 8 − 9 = 443',
    n16: '100 × 10 − (75 × 3 − 1) ÷ 2 = 888',
    n17: '(5 + 100 × 6) × 1 + 3 × 10 = 635',
    n18: '(50 − 1) × 9 − 3 − 2 + 10 = 446',
    n19: '(75 − 1) × 9 ÷ 3 + 100 − 10 = 312',
    n20: '75 − 25 + 2 × (1 + 100) + 10 = 262',
    n21: '50 × (6 − 1) + 2 × 9 − 5 = 263',
    n22: '(75 × 10 − 2 + 8) × 1 − 25 = 731',
    n23: '50 + (100 + 7) × 9 + 3 − 25 = 991',
    n24: '25 × 4 × (10 − 3) − 6 − 5 = 689',
    n25: '8 × (4 + 50 × 3) ÷ 7 + 5 = 181',
    n26: '(75 − 8 − 1 + 6 − 7) × 5 = 325',
    n27: '50 × 8 − 10 − 6 − 7 − 5 = 372',
    n28: '(5 + 4) × (100 + 4 + 4 − 6) = 918',
    n29: '75 + 4 + 8 × (3 + 2) + 3 = 122',
    n30: '(50 − 8) × (100 − 4 − 1) ÷ 5 = 798',
    n31: '(7 + (100 − 8 + 10) ÷ 2) × 5 = 290',
    n32: '7 + 50 × (10 × 9 + 6) ÷ 5 = 967',
    n33: '(3 + 75 × 2 − 8) × 4 − 9 = 571',
    n34: '75 × (2 + 9) − 4 × 10 − 3 = 782',
    n35: '100 − 10 × 2 + 75 − 8 + 1 = 148',
    n36: '100 × (3 + 50) × (8 − 4) ÷ 25 = 848'
  };

  // ---------------------------------------------------------------------------
  // Utilitaires
  // ---------------------------------------------------------------------------

  const $ = id => document.getElementById(id);

  function esc(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function plural(count, singular, pluralForm) {
    return count + ' ' + (count > 1 ? (pluralForm || singular + 's') : singular);
  }

  const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

  function formatDateTime(iso) {
    return iso ? dateTimeFormat.format(new Date(iso)) : 'date non enregistrée';
  }

  function formatDate(iso) {
    return dateFormat.format(new Date(iso));
  }

  function isValidIsoDate(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  function isPositiveInteger(n) {
    return Number.isInteger(n) && n > 0;
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ---------------------------------------------------------------------------
  // Données : création, migration, validation
  // ---------------------------------------------------------------------------

  function isBuiltinId(id) {
    return BUILTIN_LEVELS.some(level => level.id === id);
  }

  function builtinOrder(id) {
    return Number(id.slice(1));
  }

  function builtinCopy(level) {
    return {
      id: level.id,
      name: level.name,
      numbers: [...level.numbers],
      target: level.target,
      order: builtinOrder(level.id),
      builtin: true
    };
  }

  function defaultSettings() {
    return { timerSeconds: DEFAULT_TIMER_SECONDS, timerSound: true, lastExportAt: null };
  }

  function freshData() {
    return {
      schemaVersion: SCHEMA_VERSION,
      settings: defaultSettings(),
      classes: [],
      levels: BUILTIN_LEVELS.map(builtinCopy)
    };
  }

  /**
   * v1 → v2 : un nouveau niveau 8 a été inséré dans la liste préchargée.
   * Les anciens niveaux 8 à 11 deviennent 9 à 12, y compris dans la progression
   * des classes.
   */
  function migrateV1toV2(d) {
    const byId = new Map(d.levels.map(level => [level && level.id, level]));
    ['n11', 'n10', 'n9', 'n8'].forEach(id => {
      const level = byId.get(id);
      if (!level) return;
      const shifted = builtinOrder(id) + 1;
      level.id = 'n' + shifted;
      level.name = 'Niveau ' + shifted;
    });
    d.classes.forEach(c => {
      if (!c) return;
      c.completed = (c.completed || []).map(id =>
        /^n(8|9|10|11)$/.test(id) ? 'n' + (builtinOrder(id) + 1) : id
      );
    });
    d.levels.push(builtinCopy(BUILTIN_LEVELS.find(level => level.id === 'n8')));
  }

  /**
   * v2 → v3 : ajout du champ `order` explicite et de l'historique par classe.
   * Les niveaux préchargés gardent leur numéro ; les niveaux ajoutés se placent
   * à la suite, dans l'ordre où ils étaient enregistrés.
   */
  function migrateV2toV3(d) {
    let nextOrder = BUILTIN_LEVELS.length;
    const names = new Map();
    d.levels.forEach(level => {
      if (!level) return;
      level.order = isBuiltinId(level.id) ? builtinOrder(level.id) : ++nextOrder;
      names.set(level.id, level.name);
    });
    d.classes.forEach(c => {
      if (!c) return;
      // Les validations antérieures n'avaient pas de date.
      c.history = (c.completed || []).map(levelId => ({
        levelId,
        levelName: names.get(levelId) || levelId,
        at: null
      }));
    });
  }

  function cleanLevel(raw) {
    if (!raw || typeof raw.id !== 'string' || !raw.id) {
      throw new Error('un niveau n’a pas d’identifiant.');
    }
    const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : raw.id;
    if (!Array.isArray(raw.numbers) || raw.numbers.length !== 6 || !raw.numbers.every(isPositiveInteger)) {
      throw new Error('les nombres du niveau « ' + name + ' » sont invalides.');
    }
    if (!Number.isInteger(raw.target) || raw.target < 0) {
      throw new Error('la cible du niveau « ' + name + ' » est invalide.');
    }
    return {
      id: raw.id,
      name,
      numbers: [...raw.numbers],
      target: raw.target,
      order: Number.isFinite(raw.order) ? raw.order : null,
      builtin: isBuiltinId(raw.id)
    };
  }

  function cleanHistoryEntry(raw, levelNames) {
    if (!raw || typeof raw.levelId !== 'string') return null;
    return {
      levelId: raw.levelId,
      levelName: typeof raw.levelName === 'string' && raw.levelName ? raw.levelName : (levelNames.get(raw.levelId) || raw.levelId),
      at: isValidIsoDate(raw.at) ? raw.at : null
    };
  }

  function cleanClass(raw, levelNames) {
    if (!raw || typeof raw.id !== 'string' || !raw.id) {
      throw new Error('une classe n’a pas d’identifiant.');
    }
    if (typeof raw.name !== 'string' || !raw.name.trim()) {
      throw new Error('une classe n’a pas de nom.');
    }
    const completed = Array.isArray(raw.completed) ? raw.completed : [];
    const history = Array.isArray(raw.history) ? raw.history : [];
    return {
      id: raw.id,
      name: raw.name.trim().slice(0, 60),
      completed: [...new Set(completed.filter(id => levelNames.has(id)))],
      history: history.map(entry => cleanHistoryEntry(entry, levelNames)).filter(Boolean)
    };
  }

  function sortLevels(levels) {
    levels.sort((a, b) =>
      a.order - b.order ||
      (a.builtin === b.builtin ? 0 : a.builtin ? -1 : 1) ||
      a.id.localeCompare(b.id)
    );
  }

  /**
   * Migre puis valide des données brutes (localStorage ou fichier importé).
   * Retourne null si ce n'est manifestement pas une sauvegarde de l'appli ;
   * lève une erreur explicite si la sauvegarde est abîmée.
   */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.classes) || !Array.isArray(raw.levels)) {
      return null;
    }
    const version = Number(raw.schemaVersion) || 1;
    if (version > SCHEMA_VERSION) {
      throw new Error('cette sauvegarde provient d’une version plus récente de l’application.');
    }
    if (version < 2) migrateV1toV2(raw);
    if (version < 3) migrateV2toV3(raw);

    // Niveaux : validation, dédoublonnage, ajout des préchargés manquants.
    const levels = [];
    const seen = new Set();
    raw.levels.forEach(item => {
      const level = cleanLevel(item);
      if (seen.has(level.id)) return;
      seen.add(level.id);
      levels.push(level);
    });
    BUILTIN_LEVELS.forEach(level => {
      if (!seen.has(level.id)) levels.push(builtinCopy(level));
    });
    let maxOrder = Math.max(0, ...levels.map(level => level.order || 0));
    levels.forEach(level => {
      if (level.order === null) level.order = ++maxOrder;
    });
    sortLevels(levels);

    // Classes.
    const levelNames = new Map(levels.map(level => [level.id, level.name]));
    const classIds = new Set();
    const classes = [];
    raw.classes.forEach(item => {
      const c = cleanClass(item, levelNames);
      if (classIds.has(c.id)) return;
      classIds.add(c.id);
      classes.push(c);
    });

    // Réglages.
    const s = raw.settings || {};
    const settings = defaultSettings();
    if (TIMER_CHOICES.includes(s.timerSeconds)) settings.timerSeconds = s.timerSeconds;
    if (typeof s.timerSound === 'boolean') settings.timerSound = s.timerSound;
    if (isValidIsoDate(s.lastExportAt)) settings.lastExportAt = s.lastExportAt;

    return { schemaVersion: SCHEMA_VERSION, settings, classes, levels };
  }

  function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return freshData();
    try {
      const d = normalize(JSON.parse(stored));
      if (d) return d;
    } catch (e) {
      console.warn('Données locales illisibles :', e);
    }
    // On met de côté les données illisibles au lieu de les écraser.
    try { localStorage.setItem(UNREADABLE_KEY, stored); } catch (e) { /* ignoré */ }
    return freshData();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      toast('Impossible d’enregistrer les données dans ce navigateur.');
    }
  }

  // ---------------------------------------------------------------------------
  // État de l'application
  // ---------------------------------------------------------------------------

  let data = loadData();

  const state = {
    activeClassId: null,
    levelId: null,
    numbersShown: false,
    targetShown: false
  };

  function currentClass() {
    return data.classes.find(c => c.id === state.activeClassId) || null;
  }

  function currentLevel() {
    return data.levels.find(level => level.id === state.levelId) || null;
  }

  function firstUncompletedLevel(c) {
    return data.levels.find(level => !c.completed.includes(level.id)) || null;
  }

  /** Niveau proposé à une classe : le premier non validé, sinon le dernier. */
  function levelToPlay(c) {
    return firstUncompletedLevel(c) || data.levels[data.levels.length - 1] || null;
  }

  function lastValidation(c) {
    return c.history.reduce((latest, entry) =>
      entry.at && (!latest || entry.at > latest) ? entry.at : latest, null);
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  function showView(id) {
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === id));
    $('homeBtn').hidden = id === 'homeView';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backHome() {
    showView('homeView');
    renderClasses();
    renderBackupInfo();
  }

  function openClass(id) {
    const c = data.classes.find(item => item.id === id);
    if (!c) return;
    state.activeClassId = id;
    showView('gameView');
    showLevel(levelToPlay(c));
  }

  function showLevel(level) {
    state.levelId = level ? level.id : null;
    state.numbersShown = false;
    state.targetShown = false;
    resetTimer();
    renderGame();
  }

  // ---------------------------------------------------------------------------
  // Accueil : classes
  // ---------------------------------------------------------------------------

  function renderClasses() {
    const total = data.levels.length;
    $('classCount').textContent = plural(data.classes.length, 'classe');

    const container = $('classList');
    if (!data.classes.length) {
      container.innerHTML = '<div class="empty">Aucune classe pour le moment.<br>Ajoute une classe pour commencer.</div>';
      return;
    }

    container.innerHTML = data.classes.map(c => {
      const done = c.completed.length;
      const allDone = total > 0 && done >= total;
      const pct = total ? Math.min(100, done / total * 100) : 0;
      const last = lastValidation(c);
      const meta = done + ' / ' + total + ' compte' + (total > 1 ? 's' : '') + ' validé' + (done > 1 ? 's' : '')
        + (allDone ? ' · Tous les niveaux réussis' : '')
        + (last ? ' · Dernière validation le ' + formatDate(last) : '');
      return '<article class="class-card">'
        + '<div style="flex:1;min-width:0">'
        + '<div class="class-name">' + esc(c.name) + '</div>'
        + '<div class="meta">' + esc(meta) + '</div>'
        + '<div class="progress"><span style="width:' + pct + '%"></span></div>'
        + '</div>'
        + '<div class="card-actions">'
        + '<button class="primary small" data-open="' + esc(c.id) + '">' + (allDone ? 'Revoir' : 'Continuer') + ' →</button>'
        + '<button class="quiet small" data-rename="' + esc(c.id) + '" aria-label="Renommer ' + esc(c.name) + '">✎</button>'
        + '<button class="danger small" data-delete="' + esc(c.id) + '" aria-label="Supprimer ' + esc(c.name) + '">×</button>'
        + '</div>'
        + '</article>';
    }).join('');

    container.querySelectorAll('[data-open]').forEach(b => { b.onclick = () => openClass(b.dataset.open); });
    container.querySelectorAll('[data-rename]').forEach(b => { b.onclick = () => renameClass(b.dataset.rename); });
    container.querySelectorAll('[data-delete]').forEach(b => { b.onclick = () => deleteClass(b.dataset.delete); });
  }

  function addClass(name) {
    if (data.classes.some(c => c.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast('Une classe porte déjà ce nom.');
      return false;
    }
    data.classes.push({ id: uid('c'), name, completed: [], history: [] });
    save();
    renderClasses();
    renderBackupInfo();
    toast('Classe ajoutée : ' + name);
    return true;
  }

  function renameClass(id) {
    const c = data.classes.find(item => item.id === id);
    if (!c) return;
    const name = prompt('Nouveau nom de la classe :', c.name);
    if (!name || !name.trim()) return;
    c.name = name.trim().slice(0, 60);
    save();
    renderClasses();
    if (state.activeClassId === id) renderGame();
  }

  function deleteClass(id) {
    const c = data.classes.find(item => item.id === id);
    if (!c) return;
    if (!confirm('Supprimer la classe « ' + c.name + ' » et sa progression ? Cette action est irréversible.')) return;
    data.classes = data.classes.filter(item => item.id !== id);
    save();
    renderClasses();
    renderBackupInfo();
  }

  // ---------------------------------------------------------------------------
  // Sauvegarde : export / import JSON
  // ---------------------------------------------------------------------------

  function renderBackupInfo() {
    const info = $('backupInfo');
    const last = data.settings.lastExportAt;
    const ageDays = last ? (Date.now() - Date.parse(last)) / 86400000 : Infinity;
    info.classList.toggle('stale', data.classes.length > 0 && ageDays > EXPORT_REMINDER_DAYS);
    if (last) {
      info.textContent = 'Dernière exportation : ' + formatDateTime(last) + '.'
        + (ageDays > EXPORT_REMINDER_DAYS ? ' Pense à en refaire une.' : '');
    } else {
      info.textContent = data.classes.length
        ? 'Aucune exportation pour l’instant. Exporte une sauvegarde pour ne pas perdre la progression.'
        : 'Exporte un fichier .json pour sauvegarder ou transférer tes classes.';
    }
  }

  function exportData() {
    const now = new Date();
    data.settings.lastExportAt = now.toISOString();
    const payload = { app: EXPORT_APP_ID, exportedAt: now.toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const day = now.toISOString().slice(0, 10);
    link.href = url;
    link.download = 'compte-est-bon-sauvegarde-' + day + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    save();
    renderBackupInfo();
    toast('Sauvegarde exportée.');
  }

  async function importFromFile(file) {
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (e) {
      toast('Ce fichier n’est pas un fichier JSON valide.');
      return;
    }
    // Accepte un export de l'appli ({ app, data }) ou directement l'objet de données.
    const raw = parsed && parsed.app === EXPORT_APP_ID && parsed.data ? parsed.data : parsed;
    let imported;
    try {
      imported = normalize(raw);
    } catch (e) {
      toast('Sauvegarde invalide : ' + e.message);
      return;
    }
    if (!imported) {
      toast('Ce fichier ne ressemble pas à une sauvegarde du compte est bon.');
      return;
    }
    const summary = plural(imported.classes.length, 'classe') + ', ' + plural(imported.levels.length, 'niveau', 'niveaux');
    if (!confirm('Importer cette sauvegarde (' + summary + ') ?\n\nLes classes et niveaux actuellement enregistrés dans ce navigateur seront remplacés.')) {
      return;
    }
    data = imported;
    save();
    state.activeClassId = null;
    state.levelId = null;
    backHome();
    toast('Sauvegarde importée : ' + summary + '.');
  }

  // ---------------------------------------------------------------------------
  // Séance : affichage d'un compte
  // ---------------------------------------------------------------------------

  function renderGame() {
    const c = currentClass();
    const level = currentLevel();
    if (!c || !level) return;

    const total = data.levels.length;
    const done = c.completed.length;
    const index = data.levels.indexOf(level);
    const alreadyValidated = c.completed.includes(level.id);
    const next = firstUncompletedLevel(c);

    $('activeClassCrumb').textContent = c.name;
    $('sideClassName').textContent = c.name;
    $('gameHeading').textContent = 'Le compte est bon · ' + c.name;
    $('levelLabel').textContent = level.name;
    $('levelCounter').textContent = (index + 1) + ' / ' + total;

    $('completedStat').textContent = done + ' / ' + total;
    $('nextStat').textContent = next ? next.name : 'Tout est réussi';
    $('classProgressBar').style.width = (total ? done / total * 100 : 0) + '%';
    $('progressHelp').textContent = next
      ? 'La prochaine validation sera enregistrée pour ' + c.name + '.'
      : 'Bravo ! Tous les niveaux actuels sont validés pour cette classe.';

    $('numberInstruction').textContent = state.numbersShown
      ? 'Les six nombres sont affichés.'
      : 'Clique sur « Afficher les nombres » pour révéler les six nombres en même temps.';
    $('numberGrid').innerHTML = level.numbers.map(n => state.numbersShown
      ? '<div class="number shown" aria-label="Nombre ' + n + '">' + n + '</div>'
      : '<div class="number hidden" aria-label="Nombre masqué"></div>'
    ).join('');

    $('targetValue').textContent = state.targetShown ? level.target : '???';
    $('targetValue').classList.toggle('masked', !state.targetShown);

    $('revealBtn').disabled = state.numbersShown;
    $('revealBtn').textContent = state.numbersShown ? 'Nombres affichés' : 'Afficher les nombres';
    $('targetBtn').disabled = !state.numbersShown || state.targetShown;
    $('targetBtn').textContent = state.targetShown ? 'Cible affichée' : 'Afficher la cible';
    $('validateBtn').disabled = !state.targetShown || alreadyValidated;
    $('validateBtn').textContent = alreadyValidated ? '✓ Niveau déjà validé' : '✓ Compte réussi — valider';

    renderHistory(c);
    renderProjection();
  }

  function renderHistory(c) {
    const entries = [...c.history].reverse();
    $('historyList').innerHTML = entries.map(entry =>
      '<li><strong>' + esc(entry.levelName) + '</strong><span>' + esc(formatDateTime(entry.at)) + '</span></li>'
    ).join('');
    $('historyList').hidden = entries.length === 0;
    $('historyEmpty').hidden = entries.length > 0;
  }

  function revealNumbers() {
    if (!currentLevel()) return;
    state.numbersShown = true;
    renderGame();
  }

  function revealTarget() {
    if (!currentLevel() || !state.numbersShown) return;
    state.targetShown = true;
    renderGame();
  }

  function resetReveal() {
    state.numbersShown = false;
    state.targetShown = false;
    resetTimer();
    renderGame();
  }

  function validateCurrentLevel() {
    const c = currentClass();
    const level = currentLevel();
    if (!c || !level || !state.targetShown || c.completed.includes(level.id)) return;

    c.completed.push(level.id);
    c.history.push({ levelId: level.id, levelName: level.name, at: new Date().toISOString() });
    save();

    const next = firstUncompletedLevel(c);
    if (next) {
      toast('Réussite enregistrée pour ' + c.name + ' !');
      showLevel(next);
    } else {
      toast('Bravo ! Tous les niveaux actuels sont validés pour ' + c.name + '.');
      renderGame();
    }
  }

  // ---------------------------------------------------------------------------
  // Mode projection
  // ---------------------------------------------------------------------------

  function isProjectionOpen() {
    return $('projectionView').classList.contains('active');
  }

  function renderProjection() {
    const level = currentLevel();
    if (!level) return;
    $('projectionNumbers').innerHTML = level.numbers.map(n =>
      '<div class="projection-number">' + (state.numbersShown ? n : '?') + '</div>'
    ).join('');
    $('projectionTarget').textContent = state.targetShown ? level.target : '???';
    $('projRevealBtn').disabled = state.numbersShown;
    $('projTargetBtn').disabled = !state.numbersShown || state.targetShown;
  }

  function openProjection() {
    if (!currentLevel()) return;
    renderProjection();
    renderTimer();
    $('projectionView').classList.add('active');
    document.body.classList.add('projection-open');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function hideProjection() {
    $('projectionView').classList.remove('active');
    document.body.classList.remove('projection-open');
    pauseTimer();
  }

  function closeProjection() {
    hideProjection();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ---------------------------------------------------------------------------
  // Minuteur (mode projection)
  // ---------------------------------------------------------------------------

  const timer = {
    remainingMs: DEFAULT_TIMER_SECONDS * 1000,
    endAt: 0,
    running: false,
    interval: null
  };

  function timerDurationMs() {
    return data.settings.timerSeconds * 1000;
  }

  function stopTicking() {
    clearInterval(timer.interval);
    timer.interval = null;
    timer.running = false;
  }

  function startTimer() {
    if (timer.remainingMs <= 0) timer.remainingMs = timerDurationMs();
    timer.endAt = Date.now() + timer.remainingMs;
    timer.running = true;
    clearInterval(timer.interval);
    timer.interval = setInterval(tickTimer, 200);
    renderTimer();
  }

  function pauseTimer() {
    if (!timer.running) return;
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    stopTicking();
    renderTimer();
  }

  function toggleTimer() {
    if (timer.running) pauseTimer();
    else startTimer();
  }

  function resetTimer() {
    stopTicking();
    timer.remainingMs = timerDurationMs();
    renderTimer();
  }

  function tickTimer() {
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    if (timer.remainingMs === 0) {
      stopTicking();
      if (data.settings.timerSound) playEndSignal();
    }
    renderTimer();
  }

  function renderTimer() {
    const seconds = Math.ceil(timer.remainingMs / 1000);
    const display = $('timerDisplay');
    const finished = timer.remainingMs === 0;
    const pristine = !timer.running && timer.remainingMs === timerDurationMs();

    display.textContent = finished ? 'Temps écoulé !' : Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    display.classList.toggle('idle', pristine);
    display.classList.toggle('warning', timer.running && seconds <= TIMER_WARNING_SECONDS);
    display.classList.toggle('time-up', finished);

    $('timerToggle').textContent = timer.running ? '❚❚ Pause' : finished ? '↺ Relancer' : pristine ? '▶ Lancer' : '▶ Reprendre';
    $('timerDuration').value = String(data.settings.timerSeconds);
    $('timerDuration').disabled = timer.running;
    $('timerSound').checked = data.settings.timerSound;
  }

  function playEndSignal() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [0, 0.35, 0.7].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = ctx.currentTime + offset;
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
      setTimeout(() => ctx.close(), 1500);
    } catch (e) {
      /* Son indisponible : le signal visuel suffit. */
    }
  }

  function formatDuration(seconds) {
    if (seconds < 60) return seconds + ' s';
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes + ' min' + (rest ? ' ' + rest : '');
  }

  // ---------------------------------------------------------------------------
  // Solutions
  // ---------------------------------------------------------------------------

  function openSolutions() {
    $('solutionsGrid').innerHTML = BUILTIN_LEVELS.map(level =>
      '<article class="solution-card">'
      + '<h3>' + esc(level.name) + ' · <span class="solution-target">' + level.target + '</span></h3>'
      + '<div class="solution-expression">' + esc(SOLUTIONS[level.id]) + '</div>'
      + '</article>'
    ).join('');
    $('solutionsOverlay').classList.add('active');
  }

  function closeSolutions() {
    $('solutionsOverlay').classList.remove('active');
  }

  function isSolutionsOpen() {
    return $('solutionsOverlay').classList.contains('active');
  }

  // ---------------------------------------------------------------------------
  // Gestion des niveaux
  // ---------------------------------------------------------------------------

  function renderLevels() {
    const c = currentClass();
    $('levelsClassCrumb').textContent = c ? c.name : 'Classe';
    $('levelsList').innerHTML = data.levels.map(level => {
      const doneCount = data.classes.filter(item => item.completed.includes(level.id)).length;
      return '<article class="class-card">'
        + '<div style="flex:1">'
        + '<div class="class-name">' + esc(level.name) + ' <span class="counter">· ' + doneCount + '/' + data.classes.length + ' classes</span></div>'
        + '<div class="meta">Nombres : ' + level.numbers.map(esc).join(', ') + ' · Cible : <strong>' + esc(level.target) + '</strong></div>'
        + '</div>'
        + (level.builtin
          ? '<span class="status">Préchargé</span>'
          : '<button class="danger small" data-level-delete="' + esc(level.id) + '">Supprimer</button>')
        + '</article>';
    }).join('');
    $('levelsList').querySelectorAll('[data-level-delete]').forEach(b => {
      b.onclick = () => deleteLevel(b.dataset.levelDelete);
    });
  }

  function addLevel(name, numbers, target) {
    if (data.levels.some(level => level.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast('Ce nom de niveau existe déjà.');
      return false;
    }
    const order = Math.max(0, ...data.levels.map(level => level.order)) + 1;
    data.levels.push({ id: uid('l'), name, numbers, target, order, builtin: false });
    sortLevels(data.levels);
    save();
    toast(name + ' a été ajouté.');
    return true;
  }

  function deleteLevel(id) {
    const level = data.levels.find(item => item.id === id);
    if (!level || level.builtin) return;
    if (!confirm('Supprimer ' + level.name + ' et son statut de validation pour toutes les classes ?\n(L’historique des classes est conservé.)')) return;
    data.levels = data.levels.filter(item => item.id !== id);
    data.classes.forEach(c => { c.completed = c.completed.filter(levelId => levelId !== id); });
    save();
    // Si le niveau supprimé était affiché, on passe au niveau à travailler.
    const c = currentClass();
    if (c && state.levelId === id) showLevel(levelToPlay(c));
    renderLevels();
    renderClasses();
  }

  function parseLevelForm() {
    const name = $('newLevelName').value.trim();
    const numbers = $('newLevelNumbers').value.trim().split(/[,;\s]+/).filter(Boolean).map(Number);
    const target = Number($('newLevelTarget').value);
    const valid = name && numbers.length === 6 && numbers.every(isPositiveInteger) && Number.isInteger(target) && target >= 0;
    return valid ? { name, numbers, target } : null;
  }

  // ---------------------------------------------------------------------------
  // Événements
  // ---------------------------------------------------------------------------

  function bindEvents() {
    // Accueil
    $('classForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('className').value.trim();
      if (name && addClass(name)) $('className').value = '';
    });
    $('exportBtn').onclick = exportData;
    $('importBtn').onclick = () => $('importFile').click();
    $('importFile').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ''; // permet de réimporter le même fichier
      if (file) importFromFile(file);
    });

    // Navigation
    $('backBtn').onclick = backHome;
    $('homeBtn').onclick = backHome;
    $('manageBtn').onclick = () => { renderLevels(); showView('levelsView'); };
    $('jumpBtn').onclick = () => { renderLevels(); showView('levelsView'); };
    $('levelsBackBtn').onclick = () => {
      const c = currentClass();
      showView('gameView');
      if (c && !currentLevel()) showLevel(levelToPlay(c));
      else renderGame();
    };

    // Séance
    $('revealBtn').onclick = revealNumbers;
    $('targetBtn').onclick = revealTarget;
    $('resetRevealBtn').onclick = resetReveal;
    $('validateBtn').onclick = validateCurrentLevel;

    // Solutions
    $('solutionsBtn').onclick = openSolutions;
    $('solutionsClose').onclick = closeSolutions;
    $('solutionsOverlay').onclick = e => { if (e.target === $('solutionsOverlay')) closeSolutions(); };

    // Projection et minuteur
    $('projectionBtn').onclick = openProjection;
    $('projectionExit').onclick = closeProjection;
    $('projRevealBtn').onclick = revealNumbers;
    $('projTargetBtn').onclick = revealTarget;
    $('timerToggle').onclick = toggleTimer;
    $('timerReset').onclick = resetTimer;
    $('timerDuration').innerHTML = TIMER_CHOICES.map(s => '<option value="' + s + '">' + formatDuration(s) + '</option>').join('');
    $('timerDuration').addEventListener('change', e => {
      data.settings.timerSeconds = Number(e.target.value);
      save();
      resetTimer();
    });
    $('timerSound').addEventListener('change', e => {
      data.settings.timerSound = e.target.checked;
      save();
    });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isProjectionOpen()) hideProjection();
    });

    // Clavier
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (isSolutionsOpen()) closeSolutions();
        else if (isProjectionOpen()) closeProjection();
        return;
      }
      if (!isProjectionOpen() || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      switch (e.key) {
        case 'n': case 'N': revealNumbers(); break;
        case 'c': case 'C': revealTarget(); break;
        case 'r': case 'R': resetTimer(); break;
        case ' ': e.preventDefault(); toggleTimer(); break;
        default: return;
      }
    });

    // Niveaux
    $('levelForm').addEventListener('submit', e => {
      e.preventDefault();
      const values = parseLevelForm();
      if (!values) {
        toast('Entre 6 nombres entiers positifs, puis une cible entière positive ou nulle.');
        return;
      }
      if (addLevel(values.name, values.numbers, values.target)) {
        $('levelForm').reset();
        renderLevels();
        renderClasses();
        renderGame();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Démarrage
  // ---------------------------------------------------------------------------

  bindEvents();
  save(); // enregistre immédiatement les données migrées
  resetTimer();
  renderClasses();
  renderBackupInfo();
})();
