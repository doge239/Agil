"""Verifica la cuenta de Enzo configurada en ITI y la grilla por bloques."""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def main():
    artifacts = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-enzo-iti')))
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1920, 'height': 1080})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            login_response = page.request.post('http://localhost:4000/api/auth/login', data={'correo': 'estudiante@ucn.cl', 'password': '123456'})
            assert login_response.ok
            login = login_response.json()
            page.add_init_script('localStorage.setItem("banner_token",' + json.dumps(login['token']) + ');localStorage.setItem("banner_user",' + json.dumps(json.dumps(login['usuario'])) + ');')
            page.goto('http://localhost:5173/avance')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.avance-plan')).to_contain_text('Ingeniería en Tecnologías de Información')
            expect(page.locator('.avance-ramo')).to_have_count(47)
            expect(page.locator('.estado-aprobada')).to_have_count(39)
            expect(page.locator('.estado-en_curso')).to_have_count(7)
            expect(page.get_by_role('button', name='Capstone Project.')).to_contain_text('Bloqueado')
            page.screenshot(path=str(artifacts / 'malla-enzo.png'), full_page=True)
            page.goto('http://localhost:5173/horario')
            page.wait_for_load_state('networkidle')
            expect(page.locator('.horario-clase')).to_have_count(11)
            expect(page.locator('.horario-tabla tbody tr')).to_have_count(6)
            expect(page.locator('.horario-tabla thead th')).to_have_count(7)
            expect(page.locator('.horario-escenario')).to_contain_text('horarios de ejemplo')
            expect(page.locator('.horario-alerta')).to_have_count(0)
            page.screenshot(path=str(artifacts / 'horario-escritorio.png'), full_page=True)
            colors = page.locator('.horario-clase').evaluate_all('(items) => items.map(e => ({name:e.querySelector("h2").textContent, color:getComputedStyle(e).backgroundColor}))')
            unique_colors = {}
            for item in colors:
                assert unique_colors.get(item['name'], item['color']) == item['color']
                unique_colors[item['name']] = item['color']
            assert len(set(unique_colors.values())) == 7
            page.get_by_label('Ver día').select_option('lunes')
            expect(page.locator('.horario-clase')).to_have_count(3)
            expect(page.locator('.horario-tabla thead th')).to_have_count(2)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(artifacts / 'horario-movil-dia.png'), full_page=True)
            page.get_by_label('Ver día').select_option('TODOS')
            assert page.locator('.horario-scroll').evaluate('(e) => e.scrollWidth > e.clientWidth')

            # Simula un cruce que atraviesa dos filas y verifica que ninguna clase se pierda.
            def con_cruce(route):
                data = route.fetch().json()
                data['horario'][0].update(dia_semana='Miércoles', hora_inicio='09:40:00', hora_fin='11:10:00')
                data['horario'][1].update(dia_semana='miercoles', hora_inicio='09:55:00', hora_fin='11:25:00')
                route.fulfill(json=data)

            page.route('**/api/academico/horario*', con_cruce)
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.locator('.horario-clase')).to_have_count(11)
            expect(page.locator('.horario-bloque-especial')).to_have_count(1)
            expect(page.locator('.horario-alerta')).to_be_visible()
            assert page.locator('.horario-cruce').count() >= 2
            expect(page.locator('.horario-bloque-especial')).to_contain_text('09:40 – 11:10')
            page.unroute('**/api/academico/horario*')
            page.route('**/api/academico/horario*', lambda route: route.fulfill(json={'horario': []}))
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.get_by_text('No hay clases registradas en este período.')).to_be_visible()
            assert not errors, errors
            print('OK: Enzo ITI, estados 39/7/1, horario de 11 sesiones, bloques, colores, filtro por día, móvil, cruces y período sin clases.')
            print('Capturas: ' + str(artifacts))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
