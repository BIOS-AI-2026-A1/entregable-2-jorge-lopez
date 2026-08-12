"""Contraste WCAG y derivación de la escala de acento (lógica pura)."""

from __future__ import annotations

import pytest

from app.contraste import (
    AA_NORMAL,
    derivar_tokens_acento,
    hex_a_rgb,
    luminancia_relativa,
    ratio_contraste,
    validar_paleta,
)

# Paleta por defecto (aspecto índigo actual): debe cumplir toda la validación.
ACENTO_DEFECTO = "#4338ca"
BANNER_DEFECTO = ("#3730a3", "#4338ca", "#4f46e5")


# --- Fórmulas ----------------------------------------------------------------

def test_hex_de_tres_digitos_se_expande():
    assert hex_a_rgb("#fff") == (255, 255, 255)
    assert hex_a_rgb("#000") == (0, 0, 0)


def test_hex_invalido_lanza():
    for malo in ("blanco", "#12", "#1234", "rgb(0,0,0)", "#ggghhh"):
        with pytest.raises(ValueError):
            hex_a_rgb(malo)


def test_luminancia_extremos():
    assert luminancia_relativa("#000000") == pytest.approx(0.0, abs=1e-6)
    assert luminancia_relativa("#ffffff") == pytest.approx(1.0, abs=1e-6)


def test_ratio_blanco_negro_es_21():
    assert ratio_contraste("#000000", "#ffffff") == pytest.approx(21.0, abs=0.05)


def test_ratio_es_simetrico():
    assert ratio_contraste("#4338ca", "#ffffff") == pytest.approx(
        ratio_contraste("#ffffff", "#4338ca")
    )


def test_gris_limite_aa():
    # #767676 sobre blanco es el gris clásico que roza el mínimo 4.5:1.
    assert ratio_contraste("#767676", "#ffffff") == pytest.approx(4.54, abs=0.1)
    assert ratio_contraste("#767676", "#ffffff") >= AA_NORMAL
    # Un tono un pelín más claro ya no llega.
    assert ratio_contraste("#787878", "#ffffff") < AA_NORMAL


# --- Derivación de tokens ----------------------------------------------------

def test_derivacion_devuelve_hex_validos():
    tokens = derivar_tokens_acento(ACENTO_DEFECTO)
    assert set(tokens) == {"hover", "claro", "foco"}
    for valor in tokens.values():
        assert hex_a_rgb(valor)  # no lanza => hex válido


def test_hover_mas_oscuro_y_claro_mas_luminoso_que_la_base():
    tokens = derivar_tokens_acento(ACENTO_DEFECTO)
    base = luminancia_relativa(ACENTO_DEFECTO)
    assert luminancia_relativa(tokens["hover"]) < base
    assert luminancia_relativa(tokens["claro"]) > base


# --- Validación de la paleta -------------------------------------------------

def test_paleta_por_defecto_cumple():
    assert validar_paleta(ACENTO_DEFECTO, *BANNER_DEFECTO) is None


def test_acento_demasiado_claro_falla_el_boton():
    fallo = validar_paleta("#cccccc", *BANNER_DEFECTO)
    assert fallo is not None
    assert "botón" in fallo.par.lower()
    assert fallo.ratio < fallo.minimo
    assert fallo.minimo == AA_NORMAL


def test_banner_demasiado_claro_falla():
    # La parada final blanca-amarillenta no contrasta con el texto blanco.
    fallo = validar_paleta(ACENTO_DEFECTO, "#3730a3", "#4338ca", "#fffbe6")
    assert fallo is not None
    assert "banner" in fallo.par.lower()


def test_color_invalido_en_la_paleta_lanza():
    with pytest.raises(ValueError):
        validar_paleta("no-es-hex", *BANNER_DEFECTO)
