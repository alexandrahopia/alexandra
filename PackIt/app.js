// app.js
import { db } from "./firebase.js";
import { logout, requireAuthOrRedirect, watchAuth } from "./auth.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// OpenWeather API key (sulla tämä on jo)
const OPENWEATHER_KEY = "379baeaa1aaae9efc725c557d2f54eee";

requireAuthOrRedirect();

const tripForm = document.getElementById("tripForm");
const statusEl = document.getElementById("status");
const weatherLine = document.getElementById("weatherLine");
const listEl = document.getElementById("packingList");
const newItem = document.getElementById("newItem");
const addItemBtn = document.getElementById("addItemBtn");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const saveMsg = document.getElementById("saveMsg");
const tripsEl = document.getElementById("trips");

const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filterSelect");

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  await logout();
  window.location.href = "login.html";
});

let currentUser = null;
let currentTripDraft = null;
let packingItems = [];

// pidetään Firestoresta tulevat matkat muistissa, jotta voidaan filtteröidä helposti
let tripsCache = [];
let unsubscribeTrips = null;

watchAuth((user) => {
  currentUser = user;

  if (!user) return;

  // estetään tuplalistenerit
  if (unsubscribeTrips) unsubscribeTrips();
  startTripsListener(user.uid);

  // filtteröinti UI:n kautta
  searchInput.addEventListener("input", renderTripsFromCache);
  filterSelect.addEventListener("change", renderTripsFromCache);
});

function setStatus(text) {
  statusEl.textContent = text || "";
}

function renderList() {
  listEl.innerHTML = "";

  if (!packingItems.length) {
    listEl.innerHTML = `<li class="muted">Lista on tyhjä.</li>`;
    return;
  }

  packingItems.forEach((item, idx) => {
    const li = document.createElement("li");
    li.style.margin = "8px 0";
    li.style.display = "flex";
    li.style.gap = "8px";
    li.style.alignItems = "center";

    const span = document.createElement("span");
    span.textContent = item;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost";
    btn.textContent = "Poista";
    btn.style.padding = "6px 10px";
    btn.addEventListener("click", () => {
      packingItems.splice(idx, 1);
      renderList();
    });

    li.appendChild(span);
    li.appendChild(btn);
    listEl.appendChild(li);
  });
}

function defaultPackingList() {
  return [
    "laturi",
    "hammasharja",
    "vaihtovaatteet",
    "deodorantti",
    "lompakko / kortit"
  ];
}

function generatePackingList({ tempC, rainLikely }) {
  const base = defaultPackingList();
  const cold = ["pipo", "hanskat", "lämpimämpi takki"];
  const mild = ["huppari", "kevyt takki"];
  const hot = ["aurinkolasit", "aurinkorasva", "kevyt paita"];
  const rain = ["sateenvarjo", "sadetakki"];

  let out = [...base];

  // jos tempC puuttuu (null/undefined), tehdään “mieto” oletus
  if (typeof tempC === "number") {
    if (tempC <= 5) out = out.concat(cold);
    else if (tempC <= 17) out = out.concat(mild);
    else out = out.concat(hot);
  } else {
    out = out.concat(mild);
  }

  if (rainLikely) out = out.concat(rain);

  // poista duplikaatit
  return Array.from(new Set(out));
}

async function fetchWeather(city) {
  if (!OPENWEATHER_KEY || OPENWEATHER_KEY.includes("PASTE_")) {
    throw new Error("Lisää OpenWeather API key (OPENWEATHER_KEY) app.js-tiedostoon.");
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=${encodeURIComponent(city)}` +
    `&appid=${OPENWEATHER_KEY}` +
    `&units=metric&lang=fi`;

  const res = await fetch(url);
  if (!res.ok) {
    // 401 = key ei ole ok / ei aktivoitunut, 404 = kaupunki ei löydy
    throw new Error(`Säähaku epäonnistui (HTTP ${res.status}).`);
  }

  const data = await res.json();

  const tempC = Math.round(data.main?.temp ?? 0);
  const desc = data.weather?.[0]?.description || "";
  const rainLikely = Boolean(data.rain) || desc.toLowerCase().includes("sade") || desc.toLowerCase().includes("rain");

  return { tempC, desc, rainLikely };
}

tripForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveMsg.textContent = "";
  setStatus("Haetaan säätä...");

  const city = document.getElementById("city").value.trim();
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!city || !startDate || !endDate) {
    setStatus("Täytä kaikki kentät.");
    return;
  }

  // perusvalidointi: loppupäivä ei ennen alkupäivää
  if (endDate < startDate) {
    setStatus("Päättymispäivä ei voi olla ennen alkamispäivää.");
    return;
  }

  try {
    const w = await fetchWeather(city);

    currentTripDraft = {
      city,
      startDate,
      endDate,
      weatherSnapshot: {
        tempC: w.tempC,
        desc: w.desc,
        rainLikely: w.rainLikely
      }
    };

    packingItems = generatePackingList({ tempC: w.tempC, rainLikely: w.rainLikely });
    weatherLine.textContent = `Sää nyt: ${w.tempC}°C, ${w.desc}${w.rainLikely ? " (sade mahdollinen)" : ""}`;
    renderList();
    setStatus("Valmis! Voit muokata listaa ja tallentaa.");
  } catch (err) {
    // ✅ FALLBACK: jos säätä ei saada, tehdään silti lista ja annetaan tallennusmahdollisuus
    setStatus("Säätä ei saatu haettua. Tein oletuspakkauslistan.");

    currentTripDraft = {
      city,
      startDate,
      endDate,
      weatherSnapshot: {
        tempC: null,
        desc: "Ei saatavilla",
        rainLikely: false
      }
    };

    packingItems = generatePackingList({ tempC: null, rainLikely: false });
    weatherLine.textContent = "Säätä ei saatu haettua – käytetään oletuslistaa.";
    renderList();

    // jos haluat, näytetään virhe vielä pienesti:
    // console.warn(err);
  }
});

addItemBtn.addEventListener("click", () => {
  const v = newItem.value.trim();
  if (!v) return;
  packingItems.push(v);
  newItem.value = "";
  renderList();
});

clearBtn.addEventListener("click", () => {
  packingItems = [];
  currentTripDraft = null;
  weatherLine.textContent = "";
  renderList();
  saveMsg.textContent = "";
  setStatus("");
});

saveBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  if (!currentTripDraft) {
    saveMsg.textContent = "Tee ensin matka ja hae sää (tai saat oletuslistan).";
    return;
  }

  if (packingItems.length === 0) {
    saveMsg.textContent = "Lista on tyhjä.";
    return;
  }

  saveMsg.textContent = "Tallennetaan...";
  try {
    const tripsRef = collection(db, "users", currentUser.uid, "trips");
    await addDoc(tripsRef, {
      ...currentTripDraft,
      packingList: packingItems,
      createdAt: serverTimestamp()
    });

    saveMsg.textContent = "Tallennettu!";
  } catch (err) {
    saveMsg.textContent = "Virhe: " + (err?.message || "tallennus ei onnistunut");
  }
});

function startTripsListener(uid) {
  const tripsRef = collection(db, "users", uid, "trips");
  const q = query(tripsRef, orderBy("createdAt", "desc"));

  unsubscribeTrips = onSnapshot(q, (snap) => {
    tripsCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderTripsFromCache();
  });
}

function renderTripsFromCache() {
  if (!currentUser) return;

  const searchVal = (searchInput.value || "").toLowerCase();
  const filterVal = filterSelect.value;

  const today = new Date();
  const todayMidnight = new Date(today.toDateString()); // päivän alku

  const filtered = tripsCache
    .filter((t) => (t.city || "").toLowerCase().includes(searchVal))
    .filter((t) => {
      if (filterVal === "all") return true;

      const end = t.endDate ? new Date(t.endDate) : null;
      if (!end) return true;

      const isPast = end < todayMidnight;
      return filterVal === "past" ? isPast : !isPast;
    });

  renderTrips(filtered, currentUser.uid);
}

function renderTrips(trips, uid) {
  tripsEl.innerHTML = "";

  if (!trips.length) {
    tripsEl.innerHTML = `<p class="muted">Ei matkoja vielä.</p>`;
    return;
  }

  trips.forEach((t) => {
    const div = document.createElement("div");
    div.style.borderTop = "1px solid #d1d5db";
    div.style.padding = "12px 0";

    const temp = t.weatherSnapshot?.tempC;
    const desc = t.weatherSnapshot?.desc;

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
        <div>
          <strong>${escapeHtml(t.city || "")}</strong>
          <span class="muted"> (${t.startDate || "?"} – ${t.endDate || "?"})</span><br/>
          <span class="muted">Sää: ${temp ?? "?"}°C, ${escapeHtml(desc || "")}</span><br/>
          <span class="muted">Lista: ${(t.packingList?.length ?? 0)} kohtaa</span>
        </div>
        <div class="row" style="margin:0;">
          <button class="btn ghost" type="button" data-del="${t.id}">Poista</button>
        </div>
      </div>
    `;

    div.querySelector(`[data-del="${t.id}"]`).addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "trips", t.id));
    });

    tripsEl.appendChild(div);
  });
}

// pieni turva ettei kaupunki/desc riko HTML:ää
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
