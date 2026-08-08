import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { fontFamily, spacing } from "../../constants/design";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export type SelectOption = {
  label: string;
  value: string;
  icon?: string;
  subtitle?: string;
};

type Props = {
  label?: string;
  placeholder: string;
  options: SelectOption[];
  selectedValue?: string | null;
  onSelect: (option: SelectOption) => void;
};

const COLORS = {
  border: "rgba(255,255,255,0.28)",
  borderAccent: "rgba(56,189,248,0.5)",
  fieldBg: "rgba(255,255,255,0.06)",
  label: "#7fa6c4",
  placeholder: "#5f7488",
  white: "#ffffff",
  itemSelectedBg: "rgba(56,189,248,0.16)",
  itemSelectedBorder: "#38bdf8",
  itemSelectedText: "#38bdf8",
  text: "#e7eef5",
  textMuted: "#8fa3b8",
  accent: "#38bdf8",
  modalBg: "#0d2137",
};

// Chevron simple (apunta a la derecha en reposo); rota 90° al abrir, quedando
// apuntando hacia abajo (v), pivotando en el centro de un contenedor cuadrado
// fijo para que no se desplace de lugar al girar.
function ChevronIcon({ size = 18, color = COLORS.label }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Selector tipo cápsula (pill), igual que los inputs de texto de la pantalla
// de login (Nro. de Documento / Contraseña). Al tocar el campo se abre un
// Modal a pantalla completa (fondo oscuro sólido) con la lista de opciones
// en scroll simple, sin buscador — igual al comportamiento de referencia.
// Cierra al elegir una opción, al tocar fuera de la lista, o con el botón
// atrás de Android (onRequestClose).
export default function SelectField({
  label,
  placeholder,
  options,
  selectedValue,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const anim = useSharedValue(0);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${anim.value * 90}deg` }],
  }));

  const openModal = () => {
    setOpen(true);
    anim.value = withTiming(1, { duration: 180 });
  };

  const closeModal = () => {
    setOpen(false);
    anim.value = withTiming(0, { duration: 180 });
  };

  const selected = selectedValue
    ? options.find((o) => o.value === selectedValue) ?? null
    : null;

  const accented = open || !!selected;

  return (
    <View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}

      <Pressable onPress={openModal}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            minHeight: 54,
            borderWidth: 1.5,
            borderRadius: 999,
            borderColor: accented ? COLORS.borderAccent : COLORS.border,
            backgroundColor: COLORS.fieldBg,
            paddingHorizontal: spacing.lg,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: fontFamily.interSemibold,
              fontSize: 15,
              textAlign: "left",
              color: selected ? COLORS.white : COLORS.placeholder,
            }}
          >
            {selected ? selected.label : placeholder}
          </Text>
          <Animated.View
            style={[
              rotateStyle,
              { marginLeft: 8, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
            ]}
          >
            <ChevronIcon size={18} color={COLORS.label} />
          </Animated.View>
        </View>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {label ? (
              <Text style={styles.modalTitle} numberOfLines={1}>
                {label}
              </Text>
            ) : null}
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {options.map((item) => {
                const sel = item.value === selectedValue;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => {
                      onSelect(item);
                      closeModal();
                    }}
                    style={({ pressed }) => [
                      styles.itemRow,
                      sel && styles.itemRowSelected,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text numberOfLines={1} style={[styles.itemLabel, sel && styles.itemLabelSelected]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              {options.length === 0 ? (
                <Text style={styles.emptyText}>No se encontraron resultados</Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.interBold,
    fontSize: 11.5,
    color: COLORS.label,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "80%",
    backgroundColor: COLORS.modalBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomWidth: 0,
  },
  modalTitle: {
    fontFamily: fontFamily.interBold,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
  itemRow: {
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemRowSelected: {
    backgroundColor: COLORS.itemSelectedBg,
    borderColor: COLORS.itemSelectedBorder,
  },
  itemLabel: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  itemLabelSelected: {
    color: COLORS.itemSelectedText,
    fontWeight: "700",
  },
});