import pytest

from app.services.asistencia_utils import puntaje_sesion, porcentaje_desde_puntajes


class TestPuntajeSesion:
    def test_presente_vale_5(self):
        assert puntaje_sesion(True, None, None) == 5

    def test_presente_ignora_motivo_y_puntaje(self):
        assert puntaje_sesion(True, "no deberia importar", 3) == 5

    def test_ausente_justificada_puntaje_3(self):
        assert puntaje_sesion(False, "Enfermedad", 3) == 3

    def test_ausente_justificada_puntaje_4(self):
        assert puntaje_sesion(False, "Enfermedad", 4) == 4

    def test_ausente_con_motivo_sin_puntaje_elegido_default_4(self):
        """Registros legacy: motivo cargado pero sin puntaje_justificacion (feature nueva)."""
        assert puntaje_sesion(False, "Enfermedad", None) == 4

    def test_ausente_sin_motivo_vale_0(self):
        assert puntaje_sesion(False, None, None) == 0

    def test_ausente_sin_motivo_ignora_puntaje_invalido(self):
        """puntaje_justificacion fuera de (3,4) sin motivo no debe otorgar puntos."""
        assert puntaje_sesion(False, None, 5) == 0


class TestPorcentajeDesdePuntajes:
    def test_lista_vacia(self):
        assert porcentaje_desde_puntajes([]) == 0.0

    def test_todo_presente_100_por_ciento(self):
        assert porcentaje_desde_puntajes([5, 5, 5]) == 100.0

    def test_mezcla_presente_justificada_y_ausente(self):
        # 5 + 4 + 0 = 9 / 3 sesiones = 3.0 promedio / 5 * 100 = 60.0%
        assert porcentaje_desde_puntajes([5, 4, 0]) == 60.0

    def test_todo_ausente_sin_justificar_0_por_ciento(self):
        assert porcentaje_desde_puntajes([0, 0, 0]) == 0.0
