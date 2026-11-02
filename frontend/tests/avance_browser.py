"""Prueba contra el proyecto levantado y la cuenta ITI demo. Requiere Python + Playwright."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('BANNER_WEB_URL', 'http://localhost:5173')
API = os.environ.get('BANNER_API_URL', 'http://localhost:4000/api')
ARTIFACTS = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-avance')))


def main():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            response = page.request.post(API + '/auth/login', data={
                'correo': os.environ.get('BANNER_DEMO_EMAIL', 'iti.demo@ucn.cl'),
                'password': os.environ.get('BANNER_DEMO_PASSWORD', '123456'),
            })
            assert response.ok, 'Crea primero la cuenta ITI demo'
            login = response.json()
            page.add_init_script('localStorage.setItem("banner_token", ' + json.dumps(login['token']) + ');'
                                 'localStorage.setItem("banner_user", ' + json.dumps(json.dumps(login['usuario'])) + ');')
            page.goto(BASE + '/avance')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.avance-semestre')).to_have_count(8)
            expect(page.locator('.avance-ramo')).to_have_count(47)
            expect(page.locator('.estado-aprobada')).to_have_count(26)
            expect(page.locator('.estado-en_curso')).to_have_count(5)
            expect(page.locator('.estado-reprobada')).to_have_count(1)
            expect(page.locator('.avance-demo')).to_be_visible()
            # Los indicadores no dependen exclusivamente del color.
            expect(page.locator('.estado-aprobada').first.locator('.avance-estado')).to_contain_text('Aprobado')
            assert page.locator('.estado-aprobada').first.evaluate('(e) => getComputedStyle(e).borderLeftColor') == 'rgb(22, 163, 74)'
            assert page.locator('.estado-en_curso').first.evaluate('(e) => getComputedStyle(e).borderLeftColor') == 'rgb(234, 179, 8)'
            page.screenshot(path=str(ARTIFACTS / 'escritorio.png'), full_page=True)

            page.get_by_role('button', name='Desarrollo Soluciones Web/Móvil.').click()
            dialog = page.get_by_role('dialog')
            expect(dialog).to_be_visible()
            expect(dialog.locator('h2')).to_have_text('Desarrollo Soluciones Web/Móvil')
            expect(dialog).to_contain_text('Ingeniería de Software')
            expect(dialog).to_contain_text('Bases de datos')
            expect(dialog).to_contain_text('Gestión de Proyectos TI')
            page.screenshot(path=str(ARTIFACTS / 'requisitos.png'), full_page=True)
            page.keyboard.press('Escape')
            expect(dialog).not_to_be_visible()
            expect(page.locator('.avance-ramo.prerrequisito')).to_have_count(2)
            expect(page.locator('.avance-ramo.relacionada')).to_have_count(3)  # Incluye el requisito de nivel 7 de Capstone.
            page.get_by_label('Mostrar', exact=True).select_option('EN_CURSO')
            expect(page.locator('.avance-ramo')).to_have_count(5)
            page.get_by_label('Mostrar', exact=True).select_option('TODAS')
            page.get_by_label('Buscar ramo', exact=True).fill('CALCULO')
            expect(page.locator('.avance-ramo')).to_have_count(2)
            page.get_by_label('Buscar ramo', exact=True).fill('sin-coincidencia-123')
            expect(page.locator('.avance-ramo')).to_have_count(0)
            expect(page.locator('.avance-sin-coincidencias')).to_have_count(8)
            page.get_by_label('Buscar ramo', exact=True).fill('')
            page.get_by_role('button', name='Quitar resaltado').click()

            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'La página desborda en móvil'
            assert page.locator('.avance-scroll').evaluate('(e) => e.scrollWidth > e.clientWidth')
            page.get_by_label('Ir al semestre').select_option('8')
            expect(page.locator('#avance-semestre-8 > h2')).to_be_in_viewport(ratio=1)
            expect(page.get_by_role('button', name='Capstone Project.')).to_be_in_viewport()
            page.screenshot(path=str(ARTIFACTS / 'movil.png'), full_page=True)
            page.get_by_role('button', name='Capstone Project.').click()
            expect(dialog).to_be_visible()
            expect(dialog).to_contain_text('Nivel 7 completo')
            expect(dialog).to_contain_text('Práctica Profesional')
            page.get_by_role('button', name='Cerrar detalle').click()
            expect(dialog).not_to_be_visible()

            # Un error del API se muestra y el botón permite volver a consultar.
            page.route('**/api/academico/avance-curricular', lambda route: route.fulfill(
                status=503, content_type='application/json', body=json.dumps({'mensaje': 'Prueba de servicio no disponible'})))
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.get_by_text('Prueba de servicio no disponible')).to_be_visible()
            page.unroute('**/api/academico/avance-curricular')
            page.get_by_role('button', name='Reintentar').click()
            expect(page.locator('.avance-ramo')).to_have_count(47)
            assert not errors, errors
            print('OK: escritorio, móvil, colores, detalle, relaciones, búsqueda, filtros y recuperación de errores.')
            print('Capturas: ' + str(ARTIFACTS))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
