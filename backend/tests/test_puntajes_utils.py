"""Tests unitarios del motor de conversion porcentaje -> nota final (Art. 24
Reglamento de Estudiante UCA, escala 1-5). Sin DB, sin cliente HTTP -- prueban
directamente porcentaje_a_escalon() y calcular_promedio_final().
"""
import pytest

from app.services.puntajes_utils import (
    APROBACION_MINIMA,
    calcular_promedio_final,
    porcentaje_a_escalon,
)


class TestPorcentajeAEscalon:
    """Tabla oficial:
    0-59 -> 1 | 60-69 -> 2 | 70-79 -> 3 | 80-90 -> 4 | 91-100 -> 5
    """

    @pytest.mark.parametrize("pct,esperado", [
        (0, 1), (30, 1), (59, 1),
        (60, 2), (65, 2), (69, 2),
        (70, 3), (75, 3), (79, 3),
        (80, 4), (85, 4), (90, 4),
        (91, 5), (95, 5), (100, 5),
    ])
    def test_rangos_internos(self, pct, esperado):
        assert porcentaje_a_escalon(pct) == esperado

    @pytest.mark.parametrize("pct,esperado", [
        (59, 1), (60, 2),   # limite 1|2
        (69, 2), (70, 3),   # limite 2|3
        (79, 3), (80, 4),   # limite 3|4
        (90, 4), (91, 5),   # limite 4|5
    ])
    def test_bordes_exactos(self, pct, esperado):
        assert porcentaje_a_escalon(pct) == esperado

    def test_redondeo_half_up_en_el_limite(self):
        # 59.5% -> round-half-up -> 60 -> nota 2 (no 1)
        assert porcentaje_a_escalon(59.5) == 2
        # 69.5% -> 70 -> nota 3 (no 2)
        assert porcentaje_a_escalon(69.5) == 3
        # 79.5% -> 80 -> nota 4 (no 3)
        assert porcentaje_a_escalon(79.5) == 4
        # 90.5% -> 91 -> nota 5 (no 4)
        assert porcentaje_a_escalon(90.5) == 5
        # 59.4% redondea para abajo a 59 -> sigue en nota 1
        assert porcentaje_a_escalon(59.4) == 1

    def test_clamping_fuera_de_rango(self):
        assert porcentaje_a_escalon(-5) == 1
        assert porcentaje_a_escalon(150) == 5


class TestCalcularPromedioFinal:
    PESOS = {"parcial1": 20.0, "parcial2": 20.0, "practico": 10.0, "final": 50.0}

    def test_sin_notas_devuelve_none(self):
        assert calcular_promedio_final({}, self.PESOS) is None

    def test_completo_100_por_ciento_da_nota_5(self):
        notas = {"parcial1": 20, "parcial2": 20, "practico": 10, "final1": 50}
        assert calcular_promedio_final(notas, self.PESOS) == 5

    def test_completo_justo_60_por_ciento_da_nota_2(self):
        # 60/100 = 60% -> nota 2 (limite exacto de aprobacion)
        notas = {"parcial1": 12, "parcial2": 12, "practico": 6, "final1": 30}
        assert calcular_promedio_final(notas, self.PESOS) == 2

    def test_completo_59_por_ciento_reprueba(self):
        notas = {"parcial1": 12, "parcial2": 11, "practico": 6, "final1": 30}  # 59/100
        assert calcular_promedio_final(notas, self.PESOS) == 1

    def test_en_curso_solo_parcial1(self):
        # materia en curso: solo parcial1 cargado, 18/20 = 90% -> nota 4
        assert calcular_promedio_final({"parcial1": 18}, self.PESOS) == 4

    def test_mejor_de_final1_final2_final3(self):
        notas = {"parcial1": 20, "parcial2": 20, "practico": 10, "final1": 20, "final2": 45, "final3": 10}
        # usa el mejor final (45) -> (20+20+10+45)/100 = 95% -> nota 5
        assert calcular_promedio_final(notas, self.PESOS) == 5

    def test_directa_es_el_escalon_final_tal_cual(self):
        # "directa": el profesor decide el 1-5 directamente, no es un porcentaje
        assert calcular_promedio_final({"directa": 4}, self.PESOS) == 4
        assert calcular_promedio_final({"directa": 1}, self.PESOS) == 1

    def test_directa_ignora_el_desglose(self):
        notas = {"directa": 3, "parcial1": 20, "parcial2": 20, "practico": 10, "final1": 50}
        assert calcular_promedio_final(notas, self.PESOS) == 3

    def test_aprobacion_minima_es_2(self):
        assert APROBACION_MINIMA == 2
