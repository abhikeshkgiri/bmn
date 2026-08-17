const base = 'http://localhost:3000';

const cookies = new Map();
function applySetCookie(headers) {
  const set = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const raw of set) {
    const [cookiePart] = raw.split(';');
    const eq = cookiePart.indexOf('=');
    if (eq === -1) continue;
    const name = cookiePart.slice(0, eq);
    const value = cookiePart.slice(eq + 1);
    cookies.set(name, value);
  }
}

function buildCookieHeader() {
  return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = buildCookieHeader();
  if (cookieHeader) headers.set('cookie', cookieHeader);
  const res = await fetch(base + path, { ...options, headers });
  applySetCookie(res.headers);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

(async () => {
  console.log('STEP 1: send OTP');
  let r = await api('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210' }),
  });
  console.log(JSON.stringify(r.body, null, 2));

  console.log('STEP 2: verify OTP');
  r = await api('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9876543210', otp: '123456' }),
  });
  console.log(JSON.stringify(r.body, null, 2));
  if (r.status !== 200 || !r.body.success) {
    throw new Error('OTP verification failed');
  }

  console.log('STEP 3: me endpoint');
  r = await api('/api/auth/me');
  console.log(JSON.stringify(r.body, null, 2));
  if (r.status !== 200 || !r.body.success) {
    throw new Error('Auth me failed');
  }

  console.log('STEP 4: fetch Delhi salons');
  r = await api('/api/salons?city=Delhi&limit=5');
  console.log('salons status', r.status, 'results', Array.isArray(r.body.data) ? r.body.data.length : 'n/a');
  const salon = r.body.data && r.body.data[0];
  if (!salon) throw new Error('No salons found');

  console.log('STEP 5: fetch services');
  r = await api(`/api/services?salonId=${salon._id}&isActive=true`);
  console.log(JSON.stringify({ status: r.status, count: Array.isArray(r.body.data) ? r.body.data.length : 'n/a' }, null, 2));
  const service = r.body.data && r.body.data[0];
  if (!service) throw new Error('No services found');

  console.log('STEP 6: fetch barbers');
  r = await api(`/api/barbers?salonId=${salon._id}&isActive=true`);
  console.log(JSON.stringify({ status: r.status, count: Array.isArray(r.body.data) ? r.body.data.length : 'n/a' }, null, 2));
  const barber = r.body.data && r.body.data[0];
  if (!barber) throw new Error('No barbers found');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const appointmentDate = tomorrow.toISOString().slice(0, 10);

  console.log('STEP 7: fetch availability');
  r = await api(`/api/bookings/availability?salonId=${salon._id}&barberId=${barber._id}&serviceId=${service._id}&date=${appointmentDate}`);
  console.log(JSON.stringify(r.body, null, 2));
  if (!r.body.success || !Array.isArray(r.body.data?.slots) || r.body.data.slots.length === 0) {
    throw new Error('No availability slots found');
  }
  const slot = r.body.data.slots.find((s) => s.available) || r.body.data.slots[0];

  console.log('STEP 8: create booking');
  r = await api('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      salonId: salon._id,
      barberId: barber._id,
      serviceId: service._id,
      appointmentDate,
      startTime: slot.startTime,
      bookingType: 'SALON',
      customerNotes: 'Validation booking',
    }),
  });
  console.log(JSON.stringify(r.body, null, 2));
  if (r.status !== 201 || !r.body.success) {
    throw new Error('Booking creation failed');
  }
  const bookingId = r.body.data && r.body.data._id;

  console.log('STEP 9: fetch booking detail');
  r = await api(`/api/bookings/${bookingId}`);
  console.log(JSON.stringify(r.body, null, 2));

  console.log('STEP 10: create Razorpay order');
  r = await api('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId }),
  });
  console.log(JSON.stringify(r.body, null, 2));
  if (r.status !== 200 || !r.body.success) {
    throw new Error('Razorpay order creation failed');
  }

  console.log('Validation complete: auth, booking creation, and payment-order creation all succeeded with real Mongo-backed data.');
})().catch((err) => {
  console.error('VALIDATION_FAILED');
  console.error(err);
  process.exit(1);
});
