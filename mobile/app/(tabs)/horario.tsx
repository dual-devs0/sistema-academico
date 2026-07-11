import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { GlassCard } from "../../components/ui/GlassCard";
import { CyanBadge } from "../../components/ui/CyanBadge";
import { SkeletonLoader } from "../../components/ui/SkeletonLoader";
import {
  colors,
  fontFamily,
  fontSize,
  radius,
  spacing,
} from "../../constants/design";
import {
  buildMonthGrid,
  fetchEventosDelMes,
  fetchProximosEventos,
  formatDiaLargo,
  formatDayMonthShort,
  isSameDay,
  MESES,
  DIAS_CORTOS,
  toIso,
  parseIsoDate,
  type CalendarCell,
  type EventoOut,
  type TipoEvento,
} from "../../services/calendarioService";

/**
 * Pantalla Horario / Calendario.
 *
 * Calendario mensual manual (grid 6×7, sin dependencias externas):
 * - Días con eventos: punto cian debajo del número.
 * - Día actual: círculo cian sólido.
 * - Día seleccionado: círculo glass con borde cian.
 * - Días fuera del mes actual: opacidad reducida.
 *
 * Sección "día seleccionado" muestra eventos del día en cards con borde
 * izquierdo cian. Hora en JetBrains Mono cuando existe (backend hoy no
 * expone hora — solo fecha —, mostramos "TODO EL DÍA").
 *
 * "Próximos Eventos" es scroll horizontal de mini-cards.
 */

const TODAY = new Date();

export default function HorarioScreen() {
  const [cursor, setCursor] = useState<{ anio: number; mes: number }>({
    anio: TODAY.getFullYear(),
    mes: TODAY.getMonth() + 1,
  });
  const [selectedIso, setSelectedIso] = useState<string>(toIso(TODAY));
  const [eventosMes, setEventosMes] = useState<EventoOut[]>([]);
  const [proximos, setProximos] = useState<EventoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [mes, prox] = await Promise.all([
        fetchEventosDelMes(cursor.anio, cursor.mes),
        fetchProximosEventos(30),
      ]);
      setEventosMes(mes);
      setProximos(prox);
    } catch {
      setError("No se pudieron cargar los eventos.");
    }
  }, [cursor]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const grid = useMemo(
    () => buildMonthGrid(cursor.anio, cursor.mes, eventosMes),
    [cursor, eventosMes],
  );

  const eventosDelDia = useMemo(
    () => grid.find((c) => c.isoDate === selectedIso)?.eventos ?? [],
    [grid, selectedIso],
  );

  const goPrevMonth = () =>
    setCursor((c) =>
      c.mes === 1 ? { anio: c.anio - 1, mes: 12 } : { anio: c.anio, mes: c.mes - 1 },
    );
  const goNextMonth = () =>
    setCursor((c) =>
      c.mes === 12 ? { anio: c.anio + 1, mes: 1 } : { anio: c.anio, mes: c.mes + 1 },
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Calendario" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyan}
          />
        }
      >
        {loading ? (
          <LoadingBody />
        ) : error ? (
          <ErrorBody message={error} onRetry={load} />
        ) : (
          <>
            <MonthHeader
              anio={cursor.anio}
              mes={cursor.mes}
              onPrev={goPrevMonth}
              onNext={goNextMonth}
            />
            <WeekDays />
            <MonthGrid
              grid={grid}
              selectedIso={selectedIso}
              onSelect={setSelectedIso}
            />

            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
              <SelectedDaySection
                selectedIso={selectedIso}
                eventos={eventosDelDia}
              />
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <UpcomingEventsSection eventos={proximos} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Month header + week days
// ---------------------------------------------------------------------------

function MonthHeader({
  anio,
  mes,
  onPrev,
  onNext,
}: {
  anio: number;
  mes: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.xl,
        marginTop: spacing.md,
      }}
    >
      <Pressable onPress={onPrev} hitSlop={12} style={navButtonStyle}>
        <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>‹</Text>
      </Pressable>
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interBold,
            fontSize: fontSize.headline,
          }}
        >
          {MESES[mes - 1]}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: fontFamily.mono,
            fontSize: fontSize.caption,
          }}
        >
          {anio}
        </Text>
      </View>
      <Pressable onPress={onNext} hitSlop={12} style={navButtonStyle}>
        <Text style={{ color: colors.textPrimary, fontSize: fontSize.headline }}>›</Text>
      </Pressable>
    </View>
  );
}

const navButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: radius.pill,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: colors.glassBg,
  borderWidth: 1,
  borderColor: colors.border,
};

function WeekDays() {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: spacing.xl,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
      }}
    >
      {DIAS_CORTOS.map((d) => (
        <View key={d} style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
              letterSpacing: 1.2,
            }}
          >
            {d.slice(0, 3)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function MonthGrid({
  grid,
  selectedIso,
  onSelect,
}: {
  grid: CalendarCell[];
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  // 6 rows × 7 cols
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < 6; i++) rows.push(grid.slice(i * 7, i * 7 + 7));

  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", marginBottom: 4 }}>
          {row.map((cell) => (
            <DayCell
              key={cell.isoDate}
              cell={cell}
              selected={cell.isoDate === selectedIso}
              onPress={() => onSelect(cell.isoDate)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function DayCell({
  cell,
  selected,
  onPress,
}: {
  cell: CalendarCell;
  selected: boolean;
  onPress: () => void;
}) {
  const isToday = isSameDay(cell.date, TODAY);

  const numberStyle = {
    color: !cell.inMonth
      ? "rgba(156,163,175,0.4)"
      : isToday
        ? "#0a0e17"
        : selected
          ? colors.cyan
          : colors.textPrimary,
    fontFamily: isToday ? fontFamily.interBold : fontFamily.interMedium,
    fontSize: fontSize.body,
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        aspectRatio: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 2,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isToday
            ? colors.cyan
            : selected
              ? colors.glassBg
              : "transparent",
          borderWidth: selected && !isToday ? 1 : 0,
          borderColor: colors.cyan,
        }}
      >
        <Text style={numberStyle}>{cell.date.getDate()}</Text>
      </View>
      {cell.hasEvents && !isToday ? (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.cyan,
            marginTop: 2,
          }}
        />
      ) : (
        <View style={{ height: 6 }} />
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Sección día seleccionado
// ---------------------------------------------------------------------------

const TIPO_LABEL: Record<TipoEvento, string> = {
  parcial: "PARCIAL",
  final: "FINAL",
  entrega: "ENTREGA",
  actividad: "ACTIVIDAD",
  feriado: "FERIADO",
  asueto: "ASUETO",
};

const TIPO_COLOR: Record<TipoEvento, string> = {
  parcial: colors.error,
  final: colors.error,
  entrega: colors.warning,
  actividad: colors.cyan,
  feriado: colors.success,
  asueto: colors.success,
};

function SelectedDaySection({
  selectedIso,
  eventos,
}: {
  selectedIso: string;
  eventos: EventoOut[];
}) {
  const isToday = isSameDay(parseIsoDate(selectedIso), TODAY);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {formatDiaLargo(selectedIso)}
        </Text>
        {isToday ? <CyanBadge label="Hoy" variant="filled" size="sm" /> : null}
      </View>

      {eventos.length === 0 ? (
        <Animated.View entering={FadeIn.duration(240)}>
          <GlassCard contentStyle={{ padding: spacing.lg, alignItems: "center" }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.inter,
                fontSize: fontSize.body,
                textAlign: "center",
              }}
            >
              Sin eventos programados para este día.
            </Text>
          </GlassCard>
        </Animated.View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {eventos.map((e, i) => (
            <Animated.View
              key={e.id}
              entering={FadeInDown.delay(i * 50).duration(280)}
            >
              <GlassCard variant="leftAccent" contentStyle={{ padding: spacing.lg }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      color: TIPO_COLOR[e.tipo],
                      fontFamily: fontFamily.interSemibold,
                      fontSize: fontSize.caption,
                      letterSpacing: 1.5,
                    }}
                  >
                    {TIPO_LABEL[e.tipo]}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.mono,
                      fontSize: fontSize.caption,
                    }}
                  >
                    TODO EL DÍA
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontFamily: fontFamily.interBold,
                    fontSize: fontSize.body,
                  }}
                  numberOfLines={2}
                >
                  {e.titulo}
                </Text>
                {e.descripcion ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontFamily: fontFamily.inter,
                      fontSize: fontSize.caption,
                      marginTop: spacing.xs,
                    }}
                    numberOfLines={2}
                  >
                    {e.descripcion}
                  </Text>
                ) : null}
              </GlassCard>
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Próximos Eventos — scroll horizontal
// ---------------------------------------------------------------------------

function UpcomingEventsSection({ eventos }: { eventos: EventoOut[] }) {
  const filtrados = eventos
    .filter(
      (e) =>
        e.tipo === "parcial" ||
        e.tipo === "final" ||
        e.tipo === "entrega" ||
        e.tipo === "actividad",
    )
    .slice(0, 10);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          paddingHorizontal: spacing.xl,
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.body,
          }}
        >
          Próximos Eventos
        </Text>
        <Text
          style={{
            color: colors.cyan,
            fontFamily: fontFamily.interMedium,
            fontSize: fontSize.caption,
          }}
        >
          Ver todos
        </Text>
      </View>

      {filtrados.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: fontSize.caption,
            }}
          >
            No hay eventos importantes en los próximos 30 días.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            gap: spacing.md,
          }}
        >
          {filtrados.map((e) => (
            <UpcomingCard key={e.id} evento={e} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function UpcomingCard({ evento }: { evento: EventoOut }) {
  const { day, month } = formatDayMonthShort(evento.fecha);
  return (
    <View style={{ width: 180 }}>
      <GlassCard contentStyle={{ padding: spacing.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            marginBottom: spacing.sm,
          }}
        >
          <View
            style={{
              backgroundColor: colors.cyanDim,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radius.sm,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.monoBold,
                fontSize: fontSize.caption,
              }}
            >
              {day}
            </Text>
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.interSemibold,
                fontSize: 9,
                letterSpacing: 1,
              }}
            >
              {month}
            </Text>
          </View>
          <Text
            style={{
              color: TIPO_COLOR[evento.tipo],
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
              letterSpacing: 1.5,
            }}
            numberOfLines={1}
          >
            {TIPO_LABEL[evento.tipo]}
          </Text>
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
          }}
          numberOfLines={2}
        >
          {evento.titulo}
        </Text>
      </GlassCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Loading / error
// ---------------------------------------------------------------------------

function LoadingBody() {
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: spacing.lg }}>
      <SkeletonLoader height={30} width="40%" />
      <SkeletonLoader height={260} />
      <SkeletonLoader height={120} />
      <SkeletonLoader height={80} />
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
        <Text
          style={{
            color: colors.error,
            fontFamily: fontFamily.interSemibold,
            fontSize: fontSize.caption,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Error
        </Text>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.inter,
            fontSize: fontSize.body,
            marginTop: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            backgroundColor: colors.cyan,
            borderRadius: radius.md,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              color: "#0a0e17",
              fontFamily: fontFamily.interSemibold,
              fontSize: fontSize.caption,
            }}
          >
            Reintentar
          </Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}
