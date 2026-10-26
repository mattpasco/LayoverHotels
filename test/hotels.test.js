/**
 * Contract tests for hotels.js, the hotel list and its sync document. Run: node --test test/
 * The document is { hotels: { <id>: { updatedAt, hotel? , deleted? } } }. Each hotel merges on its own:
 * the newest updatedAt wins. A delete keeps { updatedAt, deleted: true } so an older copy on another
 * device can not bring the hotel back. The hotels in these tests are made up.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hotels.js');

const hotel = (airport, name, extra = {}) => ({ id: 'h-' + airport + '-' + name, airport, name, ...extra });
function docWith(...hotels) {
  const doc = H.emptyDoc();
  hotels.forEach((h, n) => H.saveHotel(doc, h, n + 1));
  return doc;
}
const names = list => list.map(h => h.airport + ' ' + h.name);

test('an empty doc: no hotels', () => {
  assert.deepEqual(H.emptyDoc(), { hotels: {} });
  assert.deepEqual(H.listHotels(H.emptyDoc(), ''), []);
});

test('a saved hotel: kept with every field, text and checkboxes defaulted, and the time it was saved', () => {
  const doc = H.emptyDoc();
  const id = H.saveHotel(doc, { id: 'h1', airport: 'MEM', name: 'Test Inn' }, 30);
  assert.equal(id, 'h1');
  assert.deepEqual(doc.hotels.h1, {
    updatedAt: 30,
    hotel: {
      airport: 'MEM', name: 'Test Inn', address: '', phone: '', breakfast: '', breakfastHours: '', happyHour: '', happyHourHours: '',
      gym24: false, gymHours: '', lapPool: false, poolHours: '', plasticBottle: false, byobBottle: false, filter: false,
      food: '', fitness: '', discounts: '', notes: '', lastStay: '',
    },
  });
  assert.deepEqual(H.getHotel(doc, 'h1'), { id: 'h1', ...doc.hotels.h1.hotel });
});

test('a hotel with discounts and amenities: kept as text, and a search finds it', () => {
  const doc = H.emptyDoc();
  H.saveHotel(doc, { id: 'h1', airport: 'MEM', name: 'Test Inn', discounts: 'Crew rate $89, free parking' }, 1);
  assert.equal(doc.hotels.h1.hotel.discounts, 'Crew rate $89, free parking');
  assert.deepEqual(H.listHotels(doc, 'crew rate').map(h => h.id), ['h1']);
});

test('a hotel with all its details: kept as given; checkboxes are true or false, other fields are dropped', () => {
  const doc = H.emptyDoc();
  H.saveHotel(doc, {
    id: 'h1', airport: 'CGN', name: 'Test Haus', address: '1 Test Str', phone: '+49 1', breakfast: 'yes', breakfastHours: '6-10',
    happyHour: 'no', happyHourHours: '', gym24: 1, gymHours: '', lapPool: 'x', poolHours: '6-22', plasticBottle: 0, byobBottle: true,
    filter: undefined, food: 'Late kebab', fitness: 'River path', notes: 'Quiet floor', lastStay: '2026-10-01', evil: '<script>', updatedAt: 1,
  }, 5);
  const h = doc.hotels.h1;
  assert.equal(h.updatedAt, 5);
  assert.deepEqual([h.hotel.gym24, h.hotel.lapPool, h.hotel.plasticBottle, h.hotel.byobBottle, h.hotel.filter], [true, true, false, true, false]);
  assert.equal(h.hotel.breakfastHours, '6-10');
  assert.equal(h.hotel.lastStay, '2026-10-01');
  assert.equal('evil' in h.hotel, false);
  assert.equal('id' in h.hotel, false);
});

test('an airport code typed in lower case with spaces: kept in upper case', () => {
  const doc = H.emptyDoc();
  H.saveHotel(doc, { id: 'h1', airport: ' mem ', name: 'x' }, 1);
  assert.equal(doc.hotels.h1.hotel.airport, 'MEM');
});

test('a hotel without a 3-letter airport code: nothing is saved, and the problem is told in words', () => {
  const doc = H.emptyDoc();
  ['', 'ME', 'MEMP', 'M1M', undefined].forEach(code => {
    assert.equal(H.hotelProblem({ airport: code }), 'Enter a 3-letter airport code.', String(code));
    assert.equal(H.saveHotel(doc, { id: 'h1', airport: code, name: 'x' }, 5), null);
  });
  assert.equal(H.hotelProblem({ airport: 'mem' }), '');
  assert.deepEqual(doc, { hotels: {} });
});

test('a hotel saved without an id: gets one, starting with h', () => {
  const doc = H.emptyDoc();
  const id = H.saveHotel(doc, { airport: 'MEM', name: 'x' }, 7);
  assert.match(id, /^h/);
  assert.equal(H.getHotel(doc, id).name, 'x');
});

test('a hotel saved again with the same id: replaced, with the new time', () => {
  const doc = docWith(hotel('MEM', 'Old Name'));
  H.saveHotel(doc, { id: 'h-MEM-Old Name', airport: 'MEM', name: 'New Name', notes: 'n' }, 50);
  assert.equal(Object.keys(doc.hotels).length, 1);
  assert.deepEqual([doc.hotels['h-MEM-Old Name'].updatedAt, H.getHotel(doc, 'h-MEM-Old Name').name], [50, 'New Name']);
});

test('a deleted hotel: gone from the list, a stale copy does not bring it back', () => {
  const doc = docWith(hotel('MEM', 'A'), hotel('ORD', 'B'));
  const stale = JSON.parse(JSON.stringify(doc));
  H.removeHotel(doc, 'h-MEM-A', 9);
  assert.deepEqual(names(H.listHotels(doc, '')), ['ORD B']);
  assert.equal(H.getHotel(doc, 'h-MEM-A'), null);
  assert.deepEqual(doc.hotels['h-MEM-A'], { updatedAt: 9, deleted: true });
  assert.deepEqual(names(H.listHotels(H.mergeDocs(doc, stale), '')), ['ORD B']);
  assert.deepEqual(names(H.listHotels(H.mergeDocs(stale, doc), '')), ['ORD B']);
});

test('deleting an id that is not a hotel (nothing, or one already deleted): changes nothing', () => {
  const doc = docWith(hotel('MEM', 'A'));
  H.removeHotel(doc, 'h-MEM-A', 9);
  const before = JSON.stringify(doc);
  H.removeHotel(doc, 'nope', 10);
  H.removeHotel(doc, 'h-MEM-A', 11);
  assert.equal(JSON.stringify(doc), before);
});

test('the list: sorted by airport code, then by hotel name', () => {
  const doc = docWith(hotel('ORD', 'Zeta'), hotel('MEM', 'Beta'), hotel('MEM', 'alpha'), hotel('ATL', 'Mid'));
  assert.deepEqual(names(H.listHotels(doc, '')), ['ATL Mid', 'MEM alpha', 'MEM Beta', 'ORD Zeta']);
});

test('a search: matches the airport, name, address, food, fitness, and notes, in any case', () => {
  const doc = docWith(
    hotel('MEM', 'Inn One', { address: '5 Beale Street' }),
    hotel('ORD', 'Inn Two', { food: 'Deep dish pizza' }),
    hotel('ATL', 'Inn Three', { fitness: 'Trail by the creek' }),
    hotel('CGN', 'Inn Four', { notes: 'Ask for a quiet room' }),
  );
  assert.deepEqual(names(H.listHotels(doc, 'mem')), ['MEM Inn One']);
  assert.deepEqual(names(H.listHotels(doc, ' BEALE ')), ['MEM Inn One']);
  assert.deepEqual(names(H.listHotels(doc, 'pizza')), ['ORD Inn Two']);
  assert.deepEqual(names(H.listHotels(doc, 'creek')), ['ATL Inn Three']);
  assert.deepEqual(names(H.listHotels(doc, 'quiet')), ['CGN Inn Four']);
  assert.deepEqual(names(H.listHotels(doc, 'inn')).length, 4);
  assert.deepEqual(H.listHotels(doc, 'nothing like this'), []);
});

test('a merge: for each hotel the newer copy wins, and hotels on one side only are kept', () => {
  const phone = docWith(hotel('MEM', 'A'), hotel('ORD', 'B'));
  const pc = JSON.parse(JSON.stringify(phone));
  H.saveHotel(phone, { id: 'h-MEM-A', airport: 'MEM', name: 'A on phone' }, 100);
  H.saveHotel(pc, { id: 'h-MEM-A', airport: 'MEM', name: 'A on pc' }, 90);
  H.saveHotel(pc, { id: 'h-new', airport: 'ATL', name: 'New' }, 95);
  const m = H.mergeDocs(phone, pc);
  assert.deepEqual(names(H.listHotels(m, '')), ['ATL New', 'MEM A on phone', 'ORD B']);
  assert.deepEqual(H.listHotels(H.mergeDocs(pc, phone), '').map(h => h.name), ['New', 'A on phone', 'B']);
});

test('a merge: records with no number for updatedAt are dropped', () => {
  const m = H.mergeDocs(H.emptyDoc(), { hotels: { x: { hotel: { airport: 'MEM' } }, y: null } });
  assert.deepEqual(m, { hotels: {} });
});

test('the text for a yes/no answer with hours', () => {
  assert.equal(H.ynText('yes', '6-10'), 'Yes – 6-10');
  assert.equal(H.ynText('yes', ''), 'Yes');
  assert.equal(H.ynText('no', '6-10'), 'No');
  assert.equal(H.ynText('', '6-10'), '6-10');
  assert.equal(H.ynText('', ''), '');
});

test('the airport code for a new hotel: the search text if it is 3 letters, else the code of the open hotel, else none', () => {
  assert.equal(H.defaultCode('mem', 'ORD'), 'MEM');
  assert.equal(H.defaultCode(' mem ', ''), 'MEM');
  assert.equal(H.defaultCode('memphis', 'ORD'), 'ORD');
  assert.equal(H.defaultCode('', 'ORD'), 'ORD');
  assert.equal(H.defaultCode('', 'O1D'), '');
  assert.equal(H.defaultCode('', undefined), '');
});
