"""Barra contraíble, preferencia persistente y transparencia del portal local."""
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from portal_visual_browser import ingresar


def main():
    artifacts = Path(os.environ.get('BANNER_SCREENSHOTS', str(Path(tempfile.gettempdir()) / 'agil-sidebar-glass')))
    artifacts.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            ingresar(page, 'estudiante@ucn.cl')
            page.goto('http://localhost:5173/avance')
            page.wait_for_load_state('networkidle')
            sidebar = page.get_by_role('complementary', name='Barra lateral')
            nav = page.get_by_role('navigation', name='Navegación principal', exact=True)
            expect(nav.get_by_role('link')).to_have_count(12)
            toggle = page.get_by_role('button', name='Contraer barra lateral')
            expect(toggle).to_have_attribute('aria-expanded', 'true')
            expect(sidebar.locator('.portal-nav-label').first).to_be_visible()
            width_before = page.locator('main').evaluate('(e) => e.getBoundingClientRect().width')
            fill = page.locator('.period-bar').evaluate('(e) => getComputedStyle(e).backgroundColor')
            assert float(fill.rstrip(')').split(',')[-1].strip()) < .5, fill
            page.screenshot(path=str(artifacts / 'expandida.png'), full_page=True)
            toggle.focus()
            page.keyboard.press('Enter')
            expect(page.get_by_role('button', name='Expandir barra lateral')).to_have_attribute('aria-expanded', 'false')
            page.wait_for_function('document.querySelector(".portal-sidebar").getBoundingClientRect().width <= 77')
            assert page.locator('main').evaluate('(e) => e.getBoundingClientRect().width') > width_before + 100
            expect(nav.get_by_role('link')).to_have_count(12)
            expect(sidebar.locator('.portal-nav-label').first).not_to_be_visible()
            expect(page.locator('.avance-ramo')).to_have_count(47)
            link = nav.get_by_role('link', name='Horario', exact=True)
            link.focus()
            expect(link.locator('.portal-nav-tooltip')).to_have_css('opacity', '1')
            link.click()
            expect(page.get_by_role('heading', name='Horario del semestre')).to_be_visible()
            expect(sidebar).to_have_class('portal-sidebar is-collapsed')
            page.wait_for_load_state('networkidle')
            page.screenshot(path=str(artifacts / 'contraida.png'), full_page=True)
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(sidebar).to_have_class('portal-sidebar is-collapsed')
            page.set_viewport_size({'width': 1366, 'height': 768})
            assert sidebar.evaluate('(e) => e.getBoundingClientRect().bottom <= innerHeight')
            page.get_by_role('button', name='Expandir barra lateral').click()
            page.wait_for_function('document.querySelector(".portal-sidebar").getBoundingClientRect().width > 200')
            expect(sidebar.locator('.portal-nav-label').first).to_be_visible()
            page.reload()
            page.wait_for_load_state('networkidle')
            expect(page.get_by_role('button', name='Contraer barra lateral')).to_be_visible()
            assert page.evaluate('localStorage.getItem("banner_sidebar_collapsed")') == 'false'
            # Una pantalla ancha expone el desplazamiento que antes causaban los
            # distintos max-width de Inicio y Avance/Horario.
            page.set_viewport_size({'width': 2200, 'height': 1000})
            posicion = sidebar.bounding_box()
            for seccion in ['Inicio', 'Horario', 'Avance curricular', 'Mi perfil']:
                nav.get_by_role('link', name=seccion, exact=True).click()
                page.wait_for_load_state('networkidle')
                actual = sidebar.bounding_box()
                for medida in ['x', 'y', 'width']:
                    assert abs(actual[medida] - posicion[medida]) < 1, (seccion, posicion, actual)
                page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                assert abs(sidebar.bounding_box()['y'] - posicion['y']) < 1
                page.evaluate('window.scrollTo(0, 0)')
            page.screenshot(path=str(artifacts / 'posicion-uniforme.png'), full_page=True)
            page.emulate_media(reduced_motion='reduce')
            assert sidebar.evaluate('(e) => parseFloat(getComputedStyle(e).transitionDuration) < .01')
            page.set_viewport_size({'width': 390, 'height': 844})
            expect(sidebar).not_to_be_visible()
            expect(page.get_by_role('navigation', name='Navegación móvil')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(artifacts / 'movil.png'), full_page=True)
            assert not errors, errors
            print('OK: posición y ancho uniformes entre secciones, fija al desplazar, contraer/expandir, persistencia, teclado y móvil.')
            print('Capturas: ' + str(artifacts))
        finally:
            browser.close()


if __name__ == '__main__':
    main()
