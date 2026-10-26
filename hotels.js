/**
 * The hotel list of the app and the rules that change it.
 * Plain browser script (also runnable under Node via `require`). No dependencies.
 *
 * doc = { hotels: { <id>: { updatedAt, hotel? , deleted? } } }
 * Each change sets updatedAt of that one hotel. A merge keeps, for each hotel, the record with the newest
 * updatedAt (the Worker does the same). A delete keeps { updatedAt, deleted: true } so an older copy on
 * another device can not bring the hotel back.
 */
(function (global) {
'use strict';

// Every field of a hotel, with its value when it is empty. A hotel keeps these fields and no others.
var EMPTY = {
  airport: '', name: '', address: '', phone: '',
  breakfast: '', breakfastHours: '', happyHour: '', happyHourHours: '',
  gym24: false, gymHours: '', lapPool: false, poolHours: '',
  plasticBottle: false, byobBottle: false, filter: false,
  food: '', fitness: '', discounts: '', notes: '', lastStay: '',
};

function emptyDoc() { return { hotels: {} }; }
function newId(now) { return 'h' + now.toString(36) + Math.random().toString(36).slice(2, 6); }
function live(rec) { return !!(rec && rec.hotel && !rec.deleted); }

/** A hotel with every field: text as text, checkboxes as true or false, the airport code in upper case. */
function normalize(h) {
  var out = {};
  Object.keys(EMPTY).forEach(function (k) {
    out[k] = typeof EMPTY[k] === 'boolean' ? !!h[k] : String(h[k] == null ? '' : h[k]);
  });
  out.airport = out.airport.trim().toUpperCase();
  return out;
}
/** What is wrong with a hotel, in words, or '' if nothing. */
function hotelProblem(h) {
  return /^[A-Z]{3}$/.test(normalize(h).airport) ? '' : 'Enter a 3-letter airport code.';
}
/** Save a hotel (a new one, or one with the same id). Returns its id, or null (nothing saved) if hotelProblem finds a problem. */
function saveHotel(doc, h, now) {
  if (hotelProblem(h)) return null;
  var id = h.id || newId(now);
  doc.hotels[id] = { updatedAt: now, hotel: normalize(h) };
  return id;
}
function removeHotel(doc, id, now) {
  if (live(doc.hotels[id])) doc.hotels[id] = { updatedAt: now, deleted: true };
}
function getHotel(doc, id) {
  return live(doc.hotels[id]) ? Object.assign({ id: id }, doc.hotels[id].hotel) : null;
}

/** The hotels that match the search text, by airport code, then by name. */
function listHotels(doc, query) {
  var q = (query || '').trim().toLowerCase();
  return Object.keys(doc.hotels).filter(function (id) { return live(doc.hotels[id]); }).map(function (id) {
    return Object.assign({ id: id }, doc.hotels[id].hotel);
  }).filter(function (h) {
    return !q || [h.airport, h.name, h.address, h.food, h.fitness, h.discounts, h.notes].join(' ').toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) {
    return a.airport !== b.airport ? (a.airport < b.airport ? -1 : 1) : a.name.localeCompare(b.name);
  });
}

/** For each hotel, the record with the newest updatedAt. A tie keeps `a`. Records with no numeric updatedAt are dropped. */
function mergeDocs(a, b) {
  var out = emptyDoc();
  [a, b].forEach(function (doc) {
    Object.keys((doc && doc.hotels) || {}).forEach(function (id) {
      var rec = doc.hotels[id];
      if (!rec || typeof rec.updatedAt !== 'number') return;
      if (!out.hotels[id] || rec.updatedAt > out.hotels[id].updatedAt) out.hotels[id] = rec;
    });
  });
  return out;
}

/** The text for a yes/no answer with hours: "Yes - 6-10", "No", or just the hours. */
function ynText(v, hours) {
  if (v === 'yes') return 'Yes' + (hours ? ' – ' + hours : '');
  if (v === 'no') return 'No';
  return hours || '';
}
/** The airport code to start a new hotel with: the search text if it is 3 letters, else the code of the open hotel. */
function defaultCode(query, current) {
  var q = (query || '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(q)) return q;
  return /^[A-Z]{3}$/.test(current || '') ? current : '';
}

var api = {
  emptyDoc: emptyDoc, newId: newId, hotelProblem: hotelProblem, saveHotel: saveHotel, removeHotel: removeHotel,
  getHotel: getHotel, listHotels: listHotels, mergeDocs: mergeDocs, ynText: ynText, defaultCode: defaultCode,
  EMPTY: EMPTY,
};
global.Hotels = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
