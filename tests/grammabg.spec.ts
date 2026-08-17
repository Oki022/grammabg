import { test, expect } from '@playwright/test';

// ── TEST 1: Ana sayfa yükleniyor mu? ──────────────────────────────────────
test('homepage loads correctly', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Title kontrol
  await expect(page).toHaveTitle(/GRAMMABG/i, { timeout: 15000 });

  // Hero başlık görünüyor mu
  await expect(page.getByText('Безупречен български')).toBeVisible({ timeout: 10000 });

  // Editor bölümü görünüyor mu
  await expect(page.locator('#editor')).toBeVisible({ timeout: 10000 });
});

// ── TEST 2: Text fix çalışıyor mu? ────────────────────────────────────────
test('text fix works for anonymous user', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });

  // Textarea'ya metin gir
  const textarea = page.locator('textarea').first();
  await expect(textarea).toBeVisible({ timeout: 10000 });
  await textarea.fill('Здравей свят това е тест.');

  // Fix butonuna bas
  const fixButton = page.getByRole('button', { name: /Поправи текста|Fix My Text/i });
  await expect(fixButton).toBeVisible({ timeout: 10000 });
  await fixButton.click();

  // Sonuç geliyor mu
  await expect(page.locator('textarea').nth(1)).not.toBeEmpty({ timeout: 30000 });
});

// ── TEST 3: Pricing sayfası doğru mu? ─────────────────────────────────────
test('pricing section shows correct plans', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  
  // Pricing bölümüne scroll et
  await page.evaluate(() => {
    document.getElementById('pricing')?.scrollIntoView();
  });

  // 3 plan görünüyor mu
  await expect(page.getByText('Безплатен план')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: 'Pro план', exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Годишен Pro')).toBeVisible({ timeout: 10000 });

  // Fiyatlar doğru mu
  await expect(page.getByText('€7.90', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('€69.99')).toBeVisible({ timeout: 10000 });
});

// ── TEST 4: Login sayfası çalışıyor mu? ───────────────────────────────────
test('login page renders correctly', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Email ve şifre alanları var mı
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });

  // Google butonu var mı
  await expect(page.getByRole('button', { name: /Google/i })).toBeVisible({ timeout: 10000 });

  // Giriş butonu var mı
  await expect(page.getByRole('button', { name: /Вход|Sign in/i })).toBeVisible({ timeout: 10000 });
});