document.addEventListener('DOMContentLoaded', () => {
// Toast
const toast = msg => {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
};

// API
const api = async (url, method = 'GET', body = null) => {
    const r = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : null });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    return j;
};

// Slider
let si = 0;
const slides = document.querySelector('.slides');
if (slides) {
    const move = d => { si = (si + d + 4) % 4; slides.style.transform = `translateX(-${si * 100}%)`; };
    document.querySelector('.slider-next').onclick = () => move(1);
    document.querySelector('.slider-prev').onclick = () => move(-1);
    setInterval(() => move(1), 3000);
}

const user = JSON.parse(localStorage.getItem('user'));
const logout = () => { localStorage.removeItem('user'); location.href = 'login.html'; };

// Login
const lf = document.getElementById('loginForm');
if (lf) lf.onsubmit = async e => {
    e.preventDefault();
    try {
        const res = await api('/api/login', 'POST', Object.fromEntries(new FormData(lf)));
        localStorage.setItem('user', JSON.stringify(res));
        location.href = res.role === 'admin' ? 'admin.html' : 'dashboard.html';
    } catch (e) { toast(e.message); }
};

// Registration
const rf = document.getElementById('registerForm');
if (rf) rf.onsubmit = async e => {
    e.preventDefault();
    const li = document.getElementById('regLogin'), pi = document.getElementById('regPass');
    const ok1 = /^[A-Za-z0-9]{6,}$/.test(li.value), ok2 = pi.value.length >= 8;
    li.parentElement.classList.toggle('has-error', !ok1);
    pi.parentElement.classList.toggle('has-error', !ok2);
    if (!ok1 || !ok2) return toast('Проверьте ошибки');
    try {
        await api('/api/register', 'POST', Object.fromEntries(new FormData(rf)));
        toast('Готово!'); setTimeout(() => location.href = 'login.html', 1500);
    } catch (e) { toast(e.message); }
};

// Create request
const cf = document.getElementById('createForm');
if (cf && user) cf.onsubmit = async e => {
    e.preventDefault();
    try {
        await api('/api/requests', 'POST', { ...Object.fromEntries(new FormData(cf)), user_id: user.id });
        toast('Заявка создана!'); setTimeout(() => location.href = 'dashboard.html', 1500);
    } catch (e) { toast(e.message); }
};

// User requests – template‑based rendering
const rl = document.getElementById('requestsList');
if (rl && user) {
    const tpl = document.getElementById('reqTpl');
    const load = async () => {
        const reqs = await api(`/api/requests/${user.id}`);
        rl.innerHTML = '';
        reqs.forEach(r => {
            const card = tpl.content.cloneNode(true);
            const statusKey = r.status.split(' ')[1] || r.status;
            card.querySelector('[data-f=venue]').textContent = r.venue;
            card.querySelector('[data-f=meta]').textContent = `${r.booking_date} · ${r.payment_method}`;
            const badge = card.querySelector('[data-f=badge]');
            badge.textContent = r.status;
            badge.classList.add('status-' + statusKey);
            if (r.status === 'Банкет завершен') {
                const block = card.querySelector('.rev-block');
                block.style.display = 'block';
                if (r.review) {
                    const pt = block.querySelector('.rev-text');
                    pt.textContent = 'Отзыв: ' + r.review;
                    pt.style.display = 'block';
                    block.querySelector('.rev-input').style.display = 'none';
                    block.querySelector('.rev-btn').style.display = 'none';
                } else {
                    const btn = block.querySelector('.rev-btn');
                    btn.onclick = async () => {
                        const v = block.querySelector('.rev-input').value;
                        if (!v) return;
                        await api(`/api/requests/${r.id}/review`, 'PUT', { review: v });
                        toast('Отзыв сохранён'); load();
                    };
                }
            }
            rl.appendChild(card);
        });
    };
    load();
}

// Admin – template‑based rendering
const al = document.getElementById('adminList');
if (al && user?.role === 'admin') {
    let all = [];
    const tpl = document.getElementById('adminTpl');
    const render = data => {
        al.innerHTML = '';
        data.forEach(r => {
            const card = tpl.content.cloneNode(true);
            card.querySelector('[data-f=fullname]').textContent = r.fullname;
            card.querySelector('[data-f=phone]').textContent = r.phone;
            card.querySelector('[data-f=meta]').textContent = `${r.venue} · ${r.booking_date}`;
            const sel = card.querySelector('select');
            sel.value = r.status;
            sel.onchange = async () => {
                await api(`/api/admin/requests/${r.id}`, 'PUT', { status: sel.value });
                toast('Статус: ' + sel.value);
            };
            al.appendChild(card);
        });
    };
    api('/api/admin/requests').then(d => { all = d; render(d); });
    document.getElementById('filterStatus')?.addEventListener('change', e => {
        const v = e.target.value;
        render(v === 'Все' ? all : all.filter(r => r.status === v));
    });
}
});
