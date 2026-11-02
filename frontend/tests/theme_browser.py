"""Selector claro/oscuro: acceso, persistencia, sistema, navegación y móvil."""
import os
import re
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def brillo(color):
    rgb = [float(n) for n in re.findall(r'[\d.]+', color)[:3]]
    return sum(n * peso for n, peso in zip(rgb, [.2126, .7152, .0722]))


def main():
    artifacts = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-temas')))
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, color_scheme='light')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://localhost:5173/login')
            page.wait_for_load_state('networkidle')
            expect(page.locator('html')).to_have_attribute('data-theme', 'light')
            page.screenshot(path=str(artifacts / 'login-claro.png'), animations='disabled')
            page.get_by_role('button', name='Activar modo oscuro').click()
            expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
            expect(page.get_by_role('button', name='Activar modo claro')).to_have_attribute('aria-pressed', 'true')
            assert page.evaluate('localStorage.getItem("banner_theme")') == 'dark'
            page.screenshot(path=str(artifacts / 'login-oscuro.png'), animations='disabled')
            campo = page.get_by_label('Correo institucional')
            assert brillo(campo.evaluate('(e)=>getComputedStyle(e).color')) > brillo(campo.evaluate('(e)=>getComputedStyle(e).backgroundColor'))
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
            campo.fill('estudiante@ucn.cl')
            page.get_by_label('Contraseña', exact=True).fill('123456')
            page.get_by_role('button', name='Ingresar').click()
            expect(page.get_by_role('heading', name='Hola, Enzo.')).to_be_visible()
            expect(page.get_by_role('button', name='Activar modo claro')).to_be_visible()
            page.goto('http://localhost:5173/avance')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.estado-aprobada')).to_have_count(39)
            expect(page.locator('.estado-en_curso')).to_have_count(7)
            page.screenshot(path=str(artifacts / 'malla-oscura.png'), full_page=True, animations='disabled')
            page.get_by_role('button', name='Ver malla completa').click()
            dialog = page.get_by_role('dialog', name='Ingeniería en Tecnologías de Información')
            expect(dialog).to_be_visible()
            expect(dialog.locator('.avance-ramo')).to_have_count(47)
            page.get_by_role('button', name='Cerrar vista completa').click()
            page.get_by_role('button', name='Bases de datos.').click()
            detalle = page.get_by_role('dialog', name='Bases de datos', exact=True)
            expect(detalle).to_be_visible()
            assert brillo(detalle.locator('.avance-detalle-meta').first.evaluate('(e)=>getComputedStyle(e).color')) > 190
            assert brillo(detalle.locator('.avance-habilita small').first.evaluate('(e)=>getComputedStyle(e).color')) > 190
            page.keyboard.press('Escape')
            page.locator('.avance-fuentes summary').click()
            assert brillo(page.locator('.avance-fuentes p').evaluate('(e)=>getComputedStyle(e).color')) > 190
            page.goto('http://localhost:5173/horario')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.horario-clase')).to_have_count(11)
            page.screenshot(path=str(artifacts / 'horario-oscuro.png'), full_page=True, animations='disabled')
            for selector in ['.page-header p', '.horario-escenario', '.horario-herramientas p', '.horario-leyenda', '.horario-aclaracion']:
                assert brillo(page.locator(selector).evaluate('(e)=>getComputedStyle(e).color')) > 190, selector
            assert page.locator('.horario-clase h2').evaluate_all('(items)=>items.every(e=>getComputedStyle(e).color==="rgb(241, 246, 251)")')
            fondos = page.locator('.horario-clase').evaluate_all('(items)=>Array.from(new Set(items.map(e=>getComputedStyle(e).backgroundColor)))')
            assert len(fondos) == 7, 'Los ramos conservan siete tintes distintos en oscuro'
            page.get_by_role('button', name='Activar modo claro').click()
            expect(page.locator('html')).to_have_attribute('data-theme', 'light')
            page.screenshot(path=str(artifacts / 'horario-claro.png'), full_page=True, animations='disabled')
            for selector in ['.page-header p', '.horario-escenario', '.horario-herramientas p', '.horario-leyenda', '.horario-aclaracion']:
                assert brillo(page.locator(selector).evaluate('(e)=>getComputedStyle(e).color')) < 70, selector
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.locator('html')).to_have_attribute('data-theme', 'light')
            page.get_by_role('button', name='Activar modo oscuro').focus()
            page.keyboard.press('Enter')
            expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            expect(page.get_by_role('button', name='Activar modo claro')).to_be_visible()
            page.get_by_role('button', name='Salir').click()
            expect(page.get_by_role('heading', name='Inicia tu sesión')).to_be_visible()
            expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
            page.screenshot(path=str(artifacts / 'login-oscuro-movil.png'), full_page=True, animations='disabled')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert not errors, errors
            sistema = browser.new_page(color_scheme='dark')
            sistema.goto('http://localhost:5173/login')
            sistema.wait_for_load_state('networkidle')
            expect(sistema.locator('html')).to_have_attribute('data-theme', 'dark')
            sistema.get_by_role('button', name='Activar modo claro').click()
            sistema.reload()
            expect(sistema.locator('html')).to_have_attribute('data-theme', 'light')
            print('OK: modo claro/oscuro, formularios, persistencia, preferencia del sistema, navegación, malla, teclado y móvil.')
            print('Capturas: ' + str(artifacts))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
