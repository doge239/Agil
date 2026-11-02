"""Relaciones al pasar el cursor, sin ficha flotante; detalle solo al activar."""
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from portal_visual_browser import ingresar


def main():
    artifacts = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-malla-hover')))
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            ingresar(page, 'estudiante@ucn.cl')
            page.goto('http://localhost:5173/avance')
            page.wait_for_load_state('networkidle')
            for modo in ['claro', 'oscuro']:
                if modo == 'oscuro':
                    page.get_by_role('button', name='Activar modo oscuro').click()
                ramo = page.get_by_role('button', name='Desarrollo Soluciones Web/Móvil.')
                ramo.hover()
                expect(page.get_by_role('tooltip')).to_have_count(0)
                expect(page.get_by_role('dialog')).to_have_count(0)
                expect(page.locator('.avance-ramo.prerrequisito')).to_have_count(2)
                expect(page.locator('.avance-ramo.relacionada')).to_have_count(3)
                assert float(page.locator('.avance-ramo.prerrequisito').first.evaluate('(e)=>getComputedStyle(e).outlineWidth').replace('px', '')) >= 4
                assert float(ramo.evaluate('(e)=>getComputedStyle(e).borderLeftWidth').replace('px', '')) >= 6
                page.screenshot(path=str(artifacts / (modo + '.png')), animations='disabled')
                page.mouse.move(10, 10)
                expect(page.locator('.avance-ramo.prerrequisito')).to_have_count(0)
            page.get_by_role('button', name='Ver malla completa').click()
            completa = page.get_by_role('dialog', name='Ingeniería en Tecnologías de Información')
            completa.get_by_role('button', name='Bases de datos.').hover()
            expect(page.get_by_role('tooltip')).to_have_count(0)
            expect(page.locator('.avance-preview')).to_have_count(0)
            expect(completa).to_be_visible()
            completa.get_by_role('button', name='Cerrar vista completa').click()
            page.get_by_role('button', name='Cálculo I.').focus()
            page.keyboard.press('Tab')
            expect(page.locator('.avance-ramo.seleccionada')).to_have_count(1)
            expect(page.get_by_role('dialog')).to_have_count(0)
            expect(page.get_by_role('tooltip')).to_have_count(0)
            page.get_by_role('button', name='Bases de datos.').click()
            expect(page.get_by_role('dialog', name='Bases de datos', exact=True)).to_be_visible()
            expect(page.get_by_role('tooltip')).not_to_be_visible()
            page.get_by_role('button', name='Cerrar detalle').click()
            assert not errors, errors
            movil = browser.new_page(viewport={'width': 390, 'height': 844}, has_touch=True)
            ingresar(movil, 'estudiante@ucn.cl')
            movil.goto('http://localhost:5173/avance')
            movil.wait_for_load_state('networkidle')
            movil.get_by_role('button', name='Cálculo I.').tap()
            expect(movil.get_by_role('dialog', name='Cálculo I', exact=True)).to_be_visible()
            expect(movil.get_by_role('tooltip')).not_to_be_visible()
            print('OK: hover sin ficha, relaciones, marcos gruesos, claro/oscuro, vista completa, teclado, detalle por clic y toque móvil.')
            print('Capturas: ' + str(artifacts))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
