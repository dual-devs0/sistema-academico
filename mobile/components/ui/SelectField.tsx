import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import SearchableSelectSheet, {
  SelectOption,
} from "./SearchableSelectSheet";

export type { SelectOption };

type Props = {
  label?: string;
  placeholder: string;
  options: SelectOption[];
  selectedValue?: string | null;
  onSelect: (option: SelectOption) => void;
  searchPlaceholder?: string;
  emptyText?: string;
};

const COLORS = {
  bg: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.28)",
  borderAccent: "rgba(56,189,248,0.5)",
  label: "#7fa6c4",
  placeholder: "#5f7488",
  white: "#ffffff",
};

// Campo selector con el mismo estilo que los inputs de login (LabeledInput):
// label centrada arriba + pill (borderRadius 999). Al tocar, la lista se
// abre en una hoja desde abajo (SearchableSelectSheet) con buscador e íconos.
export default function SelectField({
  label,
  placeholder,
  options,
  selectedValue,
  onSelect,
  searchPlaceholder,
  emptyText,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = selectedValue
    ? options.find((o) => o.value === selectedValue) ?? null
    : null;

  return (
    <View>
      {label ? (
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.pill,
          { borderColor: selected ? COLORS.borderAccent : COLORS.border },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.pillText,
            { color: selected ? COLORS.white : COLORS.placeholder },
          ]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={COLORS.label} />
      </Pressable>

      <SearchableSelectSheet
        visible={open}
        title={label ?? "Seleccionar"}
        options={options}
        selectedValue={selectedValue ?? null}
        onSelect={(opt) => {
          onSelect(opt);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Inter_700Bold",
    fontSize: 11.5,
    color: COLORS.label,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 18,
  },
  pillText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    paddingVertical: 16,
    paddingHorizontal: 10,
    textAlign: "left",
  },
});
