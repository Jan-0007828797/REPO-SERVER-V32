const KEY = "kryptopoly_v32";

function canUseStorage(kind = "local") {
  try {
    return typeof window !== "undefined" && !!window[`${kind}Storage`];
  } catch {
    return false;
  }
}

function readJson(kind, key) {
  if (!canUseStorage(kind)) return {};
  try {
    return JSON.parse(window[`${kind}Storage`].getItem(key) || "{}");
  } catch {
    return {};
  }
}

function writeJson(kind, key, value) {
  if (!canUseStorage(kind)) return;
  try {
    window[`${kind}Storage`].setItem(key, JSON.stringify(value));
  } catch {}
}

function loadRoot() {
  return readJson("local", KEY);
}

function saveRoot(next) {
  writeJson("local", KEY, next || {});
}

function normalizeGameId(gameId) {
  return String(gameId || "").trim();
}

function sessionKey(gameId) {
  return `${KEY}:session:${normalizeGameId(gameId)}`;
}

export function saveObj(o) {
  saveRoot(o);
}

export function loadObj() {
  return loadRoot();
}

export function saveName(name) {
  const o = loadRoot();
  o.name = name;
  saveRoot(o);
}

export function loadName() {
  return loadRoot().name || "";
}

export function saveLastGameId(gameId) {
  const o = loadRoot();
  o.lastGameId = normalizeGameId(gameId);
  saveRoot(o);
}

export function loadLastGameId() {
  return loadRoot().lastGameId || "";
}

export function savePlayerSession(gameId, session = {}) {
  const gid = normalizeGameId(gameId);
  if (!gid) return;
  const safe = {
    playerId: String(session.playerId || ""),
    role: session.role ? String(session.role) : "",
    reconnectToken: session.reconnectToken ? String(session.reconnectToken) : "",
    updatedAt: Date.now(),
  };
  writeJson("session", sessionKey(gid), safe);

  const root = loadRoot();
  const sessions = { ...(root.sessions || {}) };
  sessions[gid] = {
    playerId: safe.playerId,
    role: safe.role,
    reconnectToken: safe.reconnectToken,
    updatedAt: safe.updatedAt,
  };
  root.sessions = sessions;
  root.lastGameId = gid;
  saveRoot(root);
}

export function loadPlayerSession(gameId) {
  const gid = normalizeGameId(gameId);
  if (!gid) return {};

  const fromSession = readJson("session", sessionKey(gid));
  if (fromSession && (fromSession.playerId || fromSession.reconnectToken || fromSession.role)) {
    return fromSession;
  }

  const root = loadRoot();
  const fromRoot = (root.sessions || {})[gid];
  if (fromRoot) return fromRoot;

  if ((root.lastGameId || "") === gid && root.playerId) {
    return { playerId: String(root.playerId), role: root.role || "", reconnectToken: "" };
  }

  return {};
}

export function loadPlayerIdForGame(gameId) {
  return loadPlayerSession(gameId).playerId || "";
}

export function savePlayerId(playerId) {
  const root = loadRoot();
  root.playerId = String(playerId || "");
  saveRoot(root);

  const gid = root.lastGameId || "";
  if (gid) {
    savePlayerSession(gid, {
      ...loadPlayerSession(gid),
      playerId,
    });
  }
}

export function loadPlayerId() {
  const root = loadRoot();
  const gid = root.lastGameId || "";
  if (gid) {
    const scoped = loadPlayerIdForGame(gid);
    if (scoped) return scoped;
  }
  return root.playerId || "";
}

export function clearSession(gameId) {
  const gid = normalizeGameId(gameId || loadLastGameId());
  if (gid && canUseStorage("session")) {
    try {
      window.sessionStorage.removeItem(sessionKey(gid));
    } catch {}
  }

  const root = loadRoot();
  if (gid && root.sessions) {
    delete root.sessions[gid];
  }
  if (!gameId || root.lastGameId === gid) {
    delete root.playerId;
    delete root.lastGameId;
    delete root.role;
  }
  saveRoot(root);
}
