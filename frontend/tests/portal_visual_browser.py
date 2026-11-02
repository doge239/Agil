"""Comprobación visual del tema, navegación y malla completa contra el portal local."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def ingresar(page, correo):
    response = page.request.post('http://localhost:4000/api/auth/login', data={'correo': correo, 'password': '123456'})
    assert response.ok, 'No se pudo iniciar la cuenta de prueba ' + correo
    login = response.json()
    page.add_init_script('localStorage.setItem("banner_token",' + json.dumps(login['token']) + ');localStorage.setItem("banner_user",' + json.dumps(json.dumps(login['usuario'])) + ');')


def main():
    artifacts = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-liquid-glass')))
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://localhost:5173/login')
            page.wait_for_load_state('networkidle')
            expect(page.get_by_role('heading', name='Inicia tu sesión')).to_be_visible()
            assert page.locator('.login-form').evaluate('(e) => getComputedStyle(e).backdropFilter') != 'none'
            page.screenshot(path=str(artifacts / 'login.png'), full_page=True)
            page.get_by_label('Correo institucional').fill('estudiante@ucn.cl')
            page.get_by_label('Contraseña', exact=True).fill('123456')
            page.get_by_role('button', name='Ingresar').click()
            expect(page.get_by_role('heading', name='Hola, Enzo.')).to_be_visible()
            page.wait_for_load_state('networkidle')
            page.screenshot(path=str(artifacts / 'inicio.png'), full_page=True)
            assert page.locator('.portal-topbar').evaluate('(e) => getComputedStyle(e).backdropFilter') != 'none'
            for ruta in ['avance', 'horario', 'perfil', 'asignaturas', 'notas', 'asistencia', 'solicitudes', 'encuestas', 'certificados', 'carreras']:
                page.goto('http://localhost:5173/' + ruta)
                page.wait_for_load_state('networkidle')
                expect(page.locator('main')).to_be_visible()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desborde en ' + ruta
            page.goto('http://localhost:5173/avance')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.avance-ramo')).to_have_count(47)
            # Todas las columnas caben en el escritorio sin cortar VIII.
            canvas = page.locator('.avance-scroll')
            assert canvas.evaluate('(e) => e.scrollWidth <= e.clientWidth + 1')
            page.screenshot(path=str(artifacts / 'malla.png'), full_page=True)
            page.get_by_role('button', name='Ver malla completa').click()
            completa = page.get_by_role('dialog', name='Ingeniería en Tecnologías de Información')
            expect(completa).to_be_visible()
            expect(completa.locator('.avance-ramo')).to_have_count(47)
            assert completa.locator('.avance-scroll').evaluate('(e) => e.scrollHeight <= e.clientHeight + 1'), 'La malla completa debe caber en altura'
            assert completa.locator('.avance-scroll').evaluate('(e) => e.scrollWidth <= e.clientWidth + 1'), 'La malla completa debe caber en ancho'
            assert completa.locator('.avance-ramo').evaluate_all('(items) => items.every(e => e.scrollHeight <= e.clientHeight + 1)'), 'Una tarjeta corta su contenido'
            page.screenshot(path=str(artifacts / 'malla-completa.png'))
            for width, height in [(1366, 768), (1280, 800)]:
                page.set_viewport_size({'width': width, 'height': height})
                assert completa.locator('.avance-ramo').evaluate_all('(items) => items.every(e => e.scrollHeight <= e.clientHeight + 1)'), 'Una tarjeta se corta en una pantalla pequeña'
            page.set_viewport_size({'width': 1440, 'height': 900})
            completa.get_by_role('button', name='Bases de datos.').click()
            detalle = page.get_by_role('dialog', name='Bases de datos', exact=True)
            expect(detalle).to_be_visible()
            page.keyboard.press('Escape')
            expect(detalle).not_to_be_visible()
            expect(completa).to_be_visible()
            page.keyboard.press('Escape')
            expect(completa).not_to_be_visible()
            expect(page.get_by_role('button', name='Ver malla completa')).to_be_focused()

            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.get_by_role('button', name='Ver malla completa').click()
            expect(completa).to_be_visible()
            expect(completa.locator('.avance-ramo')).to_have_count(47)
            assert completa.locator('.avance-scroll').evaluate('(e) => e.scrollWidth > e.clientWidth')
            assert completa.locator('.avance-ramo').evaluate_all('(items) => items.every(e => e.scrollHeight <= e.clientHeight + 1)')
            page.screenshot(path=str(artifacts / 'malla-completa-movil.png'))
            completa.get_by_role('button', name='Cerrar vista completa').click()
            page.goto('http://localhost:5173/')
            page.wait_for_load_state('networkidle')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(artifacts / 'inicio-movil.png'), full_page=True)
            page.emulate_media(reduced_motion='reduce')
            assert page.locator('.portal-main').evaluate('(e) => getComputedStyle(e).animationName') == 'none'
            assert not errors, errors
            page.close()
            # La identidad compartida también se aplica a los otros portales.
            for correo, ruta in [('docente@ucn.cl', '/docente'), ('admin.unidad@ucn.cl', '/unidad')]:
                portal = browser.new_page(viewport={'width': 1440, 'height': 1000})
                ingresar(portal, correo)
                portal.goto('http://localhost:5173' + ruta)
                portal.wait_for_load_state('networkidle')
                expect(portal.locator('.portal-sidebar')).to_be_visible()
                assert portal.evaluate('document.documentElement.scrollWidth <= innerWidth')
                portal.screenshot(path=str(artifacts / (ruta[1:] + '.png')), full_page=True)
                portal.close()
            print('OK: tema de vidrio, login, inicio, páginas del estudiante, malla completa, detalles, teclado, móvil, movimiento reducido y portales Docente/Unidad.')
            print('Capturas: ' + str(artifacts))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
