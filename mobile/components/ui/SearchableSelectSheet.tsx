import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export type SelectOption = {
  label: string;
  value: string;
  icon?: string;
  subtitle?: string;
};

type Props = {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue?: string | null;
  onSelect: (option: SelectOption) => void;
  onClose: () => void;
  searchPlaceholder?: string;
  emptyText?: string;
};

const { height: SCREEN_H } = Dimensions.get('window');

const COLORS = {
  backdrop: 'rgba(0,0,0,0.55)',
  sheetBg: '#111f30',
  handle: '#3a4a5c',
  border: '#22384d',
  itemBg: '#16283b',
  itemSelectedBg: '#0f3b45',
  itemSelectedBorder: '#1fb6b6',
  text: '#e7eef5',
  textMuted: '#8fa3b8',
  accent: '#1fb6b6',
  searchBg: '#0c1622',
};

export default function SearchableSelectSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
}: Props) {
  const [query, setQuery] = useState('');
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setQuery('');
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_H,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, options]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        <View style={styles.handle} />

        <Text style={styles.title}>{title}</Text>

        <View style={styles.searchWrap}>
          <Icon name="magnify" size={18} color={COLORS.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Icon name="close-circle" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => {
            const isSelected = item.value === selectedValue;
            return (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  styles.item,
                  isSelected && styles.itemSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.itemLeft}>
                  {item.icon ? (
                    <View
                      style={[
                        styles.iconBubble,
                        isSelected && { backgroundColor: COLORS.accent },
                      ]}
                    >
                      <Icon
                        name={item.icon}
                        size={18}
                        color={isSelected ? '#04201f' : COLORS.textMuted}
                      />
                    </View>
                  ) : null}
                  <View>
                    <Text
                      style={[
                        styles.itemLabel,
                        isSelected && styles.itemLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                </View>

                {isSelected ? (
                  <Icon name="check-circle" size={20} color={COLORS.accent} />
                ) : null}
              </Pressable>
            );
          }}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{emptyText}</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.backdrop,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.75,
    backgroundColor: COLORS.sheetBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
    marginBottom: 14,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.searchBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    padding: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.itemBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: COLORS.itemSelectedBg,
    borderColor: COLORS.itemSelectedBorder,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1c3247',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  itemLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  itemSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});
