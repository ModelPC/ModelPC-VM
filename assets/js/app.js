document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Sayfanın dilindeki metinler (footer.php içinde window.I18N olarak verilir).
const I18N = window.I18N || { lang: 'tr', strings: {} };
const T = (key, vars = {}) => Object.entries(vars)
    .reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), I18N.strings[key] ?? key);

function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Tema: kullanıcının seçimi hatırlanır, seçim yoksa sistem teması kullanılır.
$('[data-theme-toggle]')?.addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});

// Mobil menü
const menuBtn = $('[data-menu-toggle]');
const navLinks = $('#nav-links');
menuBtn?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks?.classList.contains('open')) {
        navLinks.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
    }
});

// Kaydırınca başlığa gölge
const header = $('[data-header]');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Kaydırınca beliren öğeler
if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el, i) => {
        el.style.transitionDelay = `${(i % 3) * 80}ms`;
        io.observe(el);
    });
} else {
    $$('.reveal').forEach((el) => el.classList.add('visible'));
}

// Mac kullanıcılarına Apple Silicon sürümünü öne çıkar; diğer sistemlerde yalnızca Mac'e özel olduğu belirtilir.
const isMac = /mac/i.test(navigator.userAgent);
$$('[data-os-label]').forEach((el) => { el.textContent = T(isMac ? 'js.download_mac' : 'js.download_other'); });
if (isMac) $('.download-card[data-os="mac-arm"]')?.classList.add('is-current');
if (/windows/i.test(navigator.userAgent)) $('.download-card[data-os="windows"]')?.classList.add('is-current');

// İndirme butonları: dosya GitHub'dan iner, bu sırada kısa bir bildirim gösterilir.
$$('[data-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
        if (btn.dataset.download) toast(T('js.preparing', { file: btn.dataset.download }));
    });
});

// Arama metinlerini karşılaştırmak için sadeleştirir: büyük/küçük harf, Türkçe ı/i ve aksanlar (ğ→g, é→e) fark etmez.
// Ana sayfadaki canlı indirme sayacı: GitHub sürümlerindeki toplam indirmeyi çeker ve 5 dakikada bir yeniler.
const downloadStat = $('[data-download-total]');
if (downloadStat) {
    const valueEl = $('[data-download-value]', downloadStat);
    const format = new Intl.NumberFormat(I18N.lang);
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const CACHE_KEY = 'downloadTotal';
    let current = 0;
    const show = (n) => { valueEl.textContent = format.format(n); };
    if (downloadStat.dataset.value !== '') show(Number(downloadStat.dataset.value));

    const animateTo = (target) => {
        const from = current;
        current = target;
        if (reduceMotion || from === target) { show(target); return; }
        const start = performance.now();
        const duration = from === 0 ? 1400 : 800;
        const step = (now) => {
            const p = Math.min(1, (now - start) / duration);
            show(Math.round(from + (target - from) * (1 - (1 - p) ** 3)));
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    const refresh = async () => {
        let total;
        try {
            const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
            if (cached && Date.now() - cached.at < 60_000) total = cached.total;
        } catch { /* depolama kapalı olabilir */ }
        try {
            if (total === undefined) {
                const res = await fetch(downloadStat.dataset.api, { headers: { Accept: 'application/vnd.github+json' } });
                if (!res.ok) throw new Error(String(res.status));
                const releases = await res.json();
                total = releases.reduce((sum, r) => sum + r.assets.reduce((s, a) => s + a.download_count, 0), 0);
                try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), total })); } catch { /* yok say */ }
            }
            downloadStat.classList.add('is-live');
            animateTo(total);
        } catch {
            downloadStat.classList.remove('is-live');
        }
    };
    refresh();
    setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60_000);
}

// Ana sayfadaki "nerelerde indiriliyor" bölümü: takip sunucusundan ülke/şehir toplamlarını çeker, 5 dakikada bir yeniler.
const geo = $('[data-geo]');
if (geo) {
    const lang = I18N.lang;
    const regionNames = 'DisplayNames' in Intl ? new Intl.DisplayNames([lang], { type: 'region' }) : null;
    const format = new Intl.NumberFormat(lang);
    const countryName = (code) => {
        if (!code) return T('js.geo_unknown');
        try { return regionNames?.of(code) || code; } catch { return code; }
    };
    const flag = (code) => (code ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '🌐');
    const renderList = (list, rows, label) => {
        const max = Math.max(1, ...rows.map((r) => r.downloads));
        list.replaceChildren(...rows.map((row) => {
            const li = document.createElement('li');
            const name = document.createElement('span');
            name.className = 'geo-name';
            const icon = document.createElement('span');
            icon.className = 'geo-flag';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = flag(row.country);
            const text = document.createElement('span');
            text.textContent = label(row);
            name.append(icon, text);
            const count = document.createElement('strong');
            count.textContent = format.format(row.downloads);
            const bar = document.createElement('span');
            bar.className = 'geo-bar';
            bar.style.setProperty('--w', `${Math.max(4, (row.downloads / max) * 100)}%`);
            li.append(name, count, bar);
            return li;
        }));
    };
    const load = async () => {
        try {
            const res = await fetch(geo.dataset.api);
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            renderList($('[data-geo-countries]', geo), data.countries, (r) => countryName(r.country));
            renderList($('[data-geo-cities]', geo), data.cities, (r) => `${r.city}, ${countryName(r.country)}`);
            const empty = data.countries.length === 0;
            $('.geo-grid', geo).hidden = empty;
            $('[data-geo-empty]', geo).hidden = !empty;
            geo.hidden = false;
        } catch {
            // Sunucuya ulaşılamazsa bölüm gizli kalır (ya da son başarılı veriyle görünmeye devam eder).
        }
    };
    load();
    setInterval(() => { if (!document.hidden) load(); }, 5 * 60_000);
}

const fold = (text) => text.toLocaleLowerCase(I18N.lang).replace(/ı/g, 'i').normalize('NFD').replace(/\p{M}/gu, '');

// Sürüm listesi araması
const releaseSearch = $('[data-release-search]');
releaseSearch?.addEventListener('input', () => {
    const q = fold(releaseSearch.value.trim());
    let shown = 0;
    $$('[data-release]').forEach((item) => {
        const match = fold(item.textContent).includes(q);
        item.hidden = !match;
        if (match) shown++;
    });
    $('[data-release-count]').textContent = T('download.count', { count: shown });
    $('[data-release-empty]').hidden = shown > 0;
});

// Fiyat dönemi geçişi
$$('[data-billing]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const period = btn.dataset.billing;
        $$('[data-billing]').forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
        $$('.price strong').forEach((el) => {
            el.classList.add('swap');
            setTimeout(() => {
                if (el.dataset[period]) el.textContent = el.dataset[period];
                el.classList.remove('swap');
            }, 150);
        });
        $$('[data-yearly-note]').forEach((el) => {
            el.textContent = T(period === 'yearly' ? 'pricing.billed_yearly' : 'pricing.billed_monthly');
        });
    });
});

// Form doğrulama: yazarken anında geri bildirim, gönderirken son kontrol
const form = $('form[data-validate]');
if (form) {
    const messageFor = (input) => (input.name === 'password'
        ? (input.minLength > 0 ? T('error.password_min', { min: input.minLength }) : T('error.password_empty'))
        : T(`error.${input.name}`));

    const validate = (input) => {
        const field = input.closest('.field');
        const errorEl = $(`[data-error-for="${input.name}"]`);
        const value = input.value.trim();
        let ok = input.checkValidity();
        if (input.minLength > 0 && value.length < input.minLength) ok = false;
        field.classList.toggle('has-error', !ok);
        field.classList.toggle('is-valid', ok);
        if (errorEl) errorEl.textContent = ok ? '' : messageFor(input);
        return ok;
    };

    const inputs = $$('input[required], textarea[required]', form);
    inputs.forEach((input) => {
        input.addEventListener('blur', () => input.type !== 'checkbox' && input.value && validate(input));
        input.addEventListener('change', () => input.type === 'checkbox' && validate(input));
        input.addEventListener('input', () => {
            if (input.closest('.field').classList.contains('has-error')) validate(input);
        });
    });

    const textarea = $('[data-counter]', form);
    const counter = $('[data-count]', form);
    const updateCount = () => { counter.textContent = `${textarea.value.length} / ${textarea.maxLength}`; };
    if (textarea && counter) {
        textarea.addEventListener('input', updateCount);
        updateCount();
    }

    form.addEventListener('submit', (e) => {
        const results = inputs.map(validate);
        if (results.includes(false)) {
            e.preventDefault();
            inputs[results.indexOf(false)].focus();
            return;
        }
        // Statik sitede sunucu yok: mesaj, ziyaretçinin e-posta programında hazır olarak açılır.
        if (form.dataset.mailto) {
            e.preventDefault();
            const data = new FormData(form);
            const topic = form.querySelector('select')?.selectedOptions[0]?.textContent.trim() ?? '';
            const subject = `${topic} — ${data.get('name')}`;
            const body = `${data.get('message')}\n\n— ${data.get('name')} <${data.get('email')}>`;
            location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            return;
        }
        const btn = $('[data-submit]', form);
        btn.disabled = true;
        $('span', btn).textContent = T('js.sending');
    });
}

// Şifreyi göster/gizle
$$('[data-password-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.classList.toggle('is-shown', show);
        btn.setAttribute('aria-label', T(show ? 'auth.hide' : 'auth.show'));
        input.focus();
    });
});

// Caps Lock uyarısı
const capsWarning = $('[data-caps]');
if (capsWarning) {
    $('#password').addEventListener('keyup', (e) => {
        capsWarning.hidden = !e.getModifierState?.('CapsLock');
    });
}

// Şifre gücü göstergesi
const strengthInput = $('[data-strength]');
if (strengthInput) {
    const bar = $('[data-strength-bar]');
    const label = $('[data-strength-label]');
    const levels = I18N.strings['js.strength'];
    strengthInput.addEventListener('input', () => {
        const v = strengthInput.value;
        let score = 0;
        if (v.length >= 8) {
            score = 1;
            if (/\p{Ll}/u.test(v) && /\p{Lu}/u.test(v)) score++;
            if (/\p{N}/u.test(v)) score++;
            if (/[^\p{L}\p{N}\s]/u.test(v) || v.length >= 14) score++;
        }
        bar.dataset.score = String(score);
        label.textContent = levels[score];
    });
}

// Dil menüsü: dışarı tıklayınca veya Esc ile kapanır
const langMenu = $('[data-lang-menu]');
if (langMenu) {
    // Seçilen dil hatırlanır; statik sitede ilk ziyaretteki otomatik yönlendirme bir daha çalışmaz.
    $$('a[hreflang]', langMenu).forEach((a) => a.addEventListener('click', () => {
        try { localStorage.setItem('lang', a.hreflang); } catch (err) {}
    }));
    document.addEventListener('click', (e) => {
        if (langMenu.open && !langMenu.contains(e.target)) langMenu.open = false;
    });
    langMenu.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            langMenu.open = false;
            $('summary', langMenu).focus();
        }
    });
}

// 404: "Geri dön" yalnızca geçmişte gidilecek bir sayfa varsa görünür.
document.querySelectorAll('[data-history-back]').forEach((btn) => {
    if (history.length > 1 && document.referrer) btn.hidden = false;
    btn.addEventListener('click', () => history.back());
});

// Destek sayfası araması: konu kartlarını, sorun gidermeyi ve SSS'yi birlikte süzer.
const helpSearch = $('[data-help-search]');
helpSearch?.addEventListener('input', () => {
    const q = fold(helpSearch.value.trim());
    let shown = 0;
    $$('[data-help-section]').forEach((section) => {
        let sectionShown = 0;
        section.querySelectorAll('[data-help-item]').forEach((item) => {
            const match = fold(item.textContent).includes(q);
            item.hidden = !match;
            item.classList.add('visible'); // Arama sırasında scroll animasyonunu beklemesin
            if (item.tagName === 'DETAILS') item.open = q !== '' && match;
            if (match) sectionShown++;
        });
        section.hidden = sectionShown === 0;
        shown += sectionShown;
    });
    $('[data-help-empty]').hidden = shown > 0;
});

// Statik 404 sayfası istenen adresi sunucudan alamaz; tarayıcıdan okur.
$$('[data-requested-path]').forEach((el) => {
    if (el.textContent === '/…') el.textContent = decodeURIComponent(location.pathname).slice(0, 60);
});
