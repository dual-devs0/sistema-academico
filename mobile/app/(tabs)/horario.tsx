import { colors } from "../../constants/design";
import { useTheme } from "../../hooks/useTheme";
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
  fontFamily, fontSize, radius, spacing,
} from "../../constants/design";
import {
  buildMonthGrid,
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
import { api } from "../../services/api";

const TODAY = new Date();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<TipoEvento, string> = {
  parcial:   "PARCIAL",
  final:     "FINAL",
  entrega:   "ENTREGA",
  actividad: "ACTIVIDAD",
  feriado:   "FERIADO",
  asueto:    "ASUETO",
};

const TIPO_COLOR: Record<TipoEvento, string> = {
  parcial:   "#ef4444",
  final:     "#ef4444",
  entrega:   "#f59e0b",
  actividad: "#13D6FF",
  feriado:   "#22c55e",
  asueto:    "#22c55e",
};

const TIPO_EMOJI: Record<TipoEvento, string> = {
  parcial:   "📝",
  final:     "🎓",
  entrega:   "📦",
  actividad: "📌",
  feriado:   "🏖️",
  asueto:    "🏖️",
};

function cuatrimestre(mes: number): string {
  if (mes <= 4)  return "Primer Cuatrimestre";
  if (mes <= 8)  return "Segundo Cuatrimestre";
  return "Tercer Cuatrimestre";
}

function formatHora(hora: string | null | undefined): { time: string; period: string } | null {
  if (!hora) return null;
  const [h, m] = hora.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { time: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`, period };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HorarioScreen() {
  const { colors } = useTheme();
const [cursor, setCursor] = useState({ anio: TODAY.getFullYear(), mes: TODAY.getMonth() + 1 });
  const [selectedIso, setSelectedIso] = useState<string>(toIso(TODAY));
  const [allEventos, setAllEventos] = useState<EventoOut[]>([]);
  const [proximos, setProximos] = useState<EventoOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const ahora = new Date();
      const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 6, 1);
      const hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 13, 0);

      const [eventos, prox] = await Promise.all([
        api.get<EventoOut[]>("/eventos/", {
          params: { desde: toIso(desde), hasta: toIso(hasta) },
        }).then((r) => r.data),
        fetchProximosEventos(30),
      ]);
      setAllEventos(eventos);
      setProximos(prox);
    } catch {
      setError("No se pudieron cargar los eventos.");
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const eventosMes = useMemo(
    () => allEventos.filter((e) => {
      const d = parseIsoDate(e.fecha);
      return d.getFullYear() === cursor.anio && d.getMonth() + 1 === cursor.mes;
    }),
    [allEventos, cursor],
  );

  const grid = useMemo(
    () => buildMonthGrid(cursor.anio, cursor.mes, eventosMes),
    [cursor, eventosMes],
  );

  const eventosDelDia = useMemo(
    () => grid.find((c) => c.isoDate === selectedIso)?.eventos ?? [],
    [grid, selectedIso],
  );

  const goPrev = () => setCursor((c) =>
    c.mes === 1  ? { anio: c.anio - 1, mes: 12 } : { anio: c.anio, mes: c.mes - 1 }
  );
  const goNext = () => setCursor((c) =>
    c.mes === 12 ? { anio: c.anio + 1, mes: 1  } : { anio: c.anio, mes: c.mes + 1 }
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScreenHeader title="Calendario" hideAvatar />

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
      >
        {loading ? <LoadingBody /> : error ? <ErrorBody message={error} onRetry={load} /> : (
          <>
            <CalendarCard
              anio={cursor.anio}
              mes={cursor.mes}
              grid={grid}
              selectedIso={selectedIso}
              onSelect={setSelectedIso}
              onPrev={goPrev}
              onNext={goNext}
            />

            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.xl }}>
              <SelectedDaySection selectedIso={selectedIso} eventos={eventosDelDia} />
            </View>

            <View style={{ marginTop: spacing.xl }}>
              <UpcomingSection
                eventos={proximos}
                showAll={showAllUpcoming}
                onToggleShowAll={() => setShowAllUpcoming((p) => !p)}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Calendario en card ───────────────────────────────────────────────────────

function CalendarCard({
  anio, mes, grid, selectedIso, onSelect, onPrev, onNext,
}: {
  anio: number; mes: number;
  grid: CalendarCell[];
  selectedIso: string;
  onSelect: (iso: string) => void;
  onPrev: () => void; onNext: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: spacing.xl,
        marginTop: spacing.md,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 20,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable
          onPress={onPrev}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: pressed ? colors.border : "transparent",
            borderWidth: 1, borderColor: colors.border,
            alignItems: "center", justifyContent: "center",
          })}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 20, lineHeight: 24 }}>‹</Text>
        </Pressable>

        <View style={{ alignItems: "center" }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.interBold,
              fontSize: 20,
              letterSpacing: -0.3,
            }}
          >
            {MESES[mes - 1]} {anio}
          </Text>
          <Text
            style={{
              color: colors.cyan,
              fontFamily: fontFamily.interMedium,
              fontSize: 11,
              letterSpacing: 0.3,
              marginTop: 1,
            }}
          >
            {cuatrimestre(mes)}
          </Text>
        </View>

        <Pressable
          onPress={onNext}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 34, height: 34, borderRadius: 10,
            backgroundColor: pressed ? colors.border : "transparent",
            borderWidth: 1, borderColor: colors.border,
            alignItems: "center", justifyContent: "center",
          })}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 20, lineHeight: 24 }}>›</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
        {DIAS_CORTOS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.interSemibold,
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {d.slice(0, 3).toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      <MonthGrid grid={grid} selectedIso={selectedIso} onSelect={onSelect} />
    </View>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function MonthGrid({ grid, selectedIso, onSelect }: {
  grid: CalendarCell[];
  selectedIso: string;
  onSelect: (iso: string) => void;
}) {
  const { colors } = useTheme();
  const rows: CalendarCell[][] = [];
  for (let i = 0; i < 6; i++) rows.push(grid.slice(i * 7, i * 7 + 7));

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", marginBottom: 2 }}>
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

function DayCell({ cell, selected, onPress }: {
  cell: CalendarCell; selected: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  const isToday = isSameDay(cell.date, TODAY);
  const dotColor = cell.eventos?.length
    ? TIPO_COLOR[cell.eventos[0].tipo as TipoEvento] ?? colors.cyan
    : colors.cyan;

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 3 }}
    >
      <View
        style={{
          width: 34, height: 34,
          borderRadius: 17,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isToday
            ? colors.cyan
            : selected
            ? "transparent"
            : "transparent",
          borderWidth: selected && !isToday ? 1.5 : 0,
          borderColor: colors.cyan,
        }}
      >
        <Text
          style={{
            color: !cell.inMonth
              ? "rgba(156,163,175,0.3)"
              : isToday
              ? "#0a0e17"
              : selected
              ? colors.cyan
              : colors.textPrimary,
            fontFamily: isToday || selected
              ? fontFamily.interBold
              : fontFamily.interMedium,
            fontSize: 14,
          }}
        >
          {cell.date.getDate()}
        </Text>
      </View>

      {cell.hasEvents && !isToday ? (
        <View style={{ flexDirection: "row", gap: 2, marginTop: 2, height: 5 }}>
          {(cell.eventos ?? []).slice(0, 2).map((e, i) => (
            <View
              key={i}
              style={{
                width: 4, height: 4, borderRadius: 2,
                backgroundColor: TIPO_COLOR[e.tipo as TipoEvento] ?? colors.cyan,
              }}
            />
          ))}
        </View>
      ) : (
        <View style={{ height: 6 }} />
      )}
    </Pressable>
  );
}

// ─── Sección día seleccionado ─────────────────────────────────────────────────

function SelectedDaySection({ selectedIso, eventos }: {
  selectedIso: string; eventos: EventoOut[];
}) {
  const { colors } = useTheme();

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          marginBottom: spacing.md,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interBold,
            fontSize: 17,
          }}
        >
          {formatDiaLargo(selectedIso)}
        </Text>

      </View>

      {eventos.length === 0 ? (
        <Animated.View entering={FadeIn.duration(240)}>
          <View
            style={{
              backgroundColor: colors.glassBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              padding: spacing.xl,
              alignItems: "center",
              gap: spacing.md,
            }}
          >
            <Text style={{ fontSize: 36 }}>📅</Text>
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
          </View>
        </Animated.View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {eventos.map((e, i) => (
            <Animated.View
              key={e.id}
              entering={FadeInDown.delay(i * 50).duration(260)}
            >
              <EventoDiaCard evento={e} />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Card evento del día ──────────────────────────────────────────────────────

function EventoDiaCard({ evento }: { evento: EventoOut }) {
  const { colors } = useTheme();

  const hora = formatHora(evento.hora ?? null);
  const accentColor = TIPO_COLOR[evento.tipo];
  const esUrgente = evento.tipo === "entrega" || evento.tipo === "final";

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <View style={{ width: 3, backgroundColor: accentColor }} />

      <View
        style={{
          width: 52,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: spacing.md,
          borderRightWidth: 1,
          borderRightColor: colors.border,
        }}
      >
        {hora ? (
          <>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: fontFamily.monoMedium,
                fontSize: 13,
                letterSpacing: -0.3,
              }}
            >
              {hora.time}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.mono,
                fontSize: 9,
                letterSpacing: 0.5,
              }}
            >
              {hora.period}
            </Text>
          </>
        ) : (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.mono,
              fontSize: 8,
              letterSpacing: 0.3,
              textAlign: "center",
              lineHeight: 11,
            }}
          >
            TODO{"\n"}EL DÍA
          </Text>
        )}
      </View>

      <View style={{ flex: 1, padding: spacing.md, gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text
            style={{
              color: accentColor,
              fontFamily: fontFamily.interSemibold,
              fontSize: 10,
              letterSpacing: 1.5,
            }}
          >
            {TIPO_LABEL[evento.tipo]}
          </Text>
          {esUrgente && (
            <View
              style={{
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: accentColor + "30",
                borderWidth: 1,
                borderColor: accentColor + "60",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: accentColor, fontSize: 11, fontFamily: fontFamily.interBold }}>
                !
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: 14,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {evento.titulo}
        </Text>

        {evento.ubicacion && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 10 }}>📍</Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: fontFamily.inter,
                fontSize: 11,
              }}
              numberOfLines={1}
            >
              {evento.ubicacion}
            </Text>
          </View>
        )}

        {evento.descripcion && !evento.ubicacion && (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: 11,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {evento.descripcion}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Próximos eventos ─────────────────────────────────────────────────────────

function UpcomingSection({ eventos, showAll, onToggleShowAll }: {
  eventos: EventoOut[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const { colors } = useTheme();
  const filtrados = eventos
    .filter((e) => ["parcial","final","entrega","actividad"].includes(e.tipo));

  const mostrados = showAll ? filtrados : filtrados.slice(0, 10);

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
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
        {filtrados.length > 10 && (
          <Pressable
            onPress={onToggleShowAll}
            style={({ pressed }) => ({
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: pressed ? colors.cyan + "22" : "transparent",
              borderWidth: 1,
              borderColor: pressed ? colors.cyan + "44" : "transparent",
            })}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.interMedium,
                fontSize: fontSize.caption,
              }}
            >
              {showAll ? "Menos" : `Ver todos (${filtrados.length})`}
            </Text>
          </Pressable>
        )}
      </View>

      {filtrados.length === 0 ? (
        <View style={{ paddingHorizontal: spacing.xl }}>
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <Text style={{ fontSize: 36, marginBottom: spacing.sm }}>📅</Text>
            <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.inter, fontSize: fontSize.caption, textAlign: "center" }}>
              No hay eventos importantes en los próximos 30 días.
            </Text>
          </View>
        </View>
      ) : showAll ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.sm }}>
          {mostrados.map((e, i) => (
            <Animated.View key={e.id} entering={FadeInDown.delay(i * 30).duration(240)}>
              <UpcomingCardFull evento={e} />
            </Animated.View>
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.sm }}
        >
          {mostrados.map((e, i) => (
            <Animated.View key={e.id} entering={FadeInDown.delay(i * 40).duration(240)}>
              <UpcomingCard evento={e} />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function UpcomingCardFull({ evento }: { evento: EventoOut }) {
  const { colors } = useTheme();

  const { day, month } = formatDayMonthShort(evento.fecha);
  const accentColor = TIPO_COLOR[evento.tipo];
  const emoji = TIPO_EMOJI[evento.tipo];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <View style={{ width: 3, backgroundColor: accentColor + "90" }} />
      <View
        style={{
          width: 48, alignItems: "center", justifyContent: "center",
          backgroundColor: accentColor + "10",
          borderRightWidth: 1, borderRightColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, padding: spacing.md, gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              color: accentColor,
              fontFamily: fontFamily.interSemibold,
              fontSize: 10, letterSpacing: 1.5,
            }}
          >
            {TIPO_LABEL[evento.tipo]}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: fontFamily.inter,
              fontSize: 10,
            }}
          >
            {day} {month}
          </Text>
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: 13,
            lineHeight: 17,
          }}
          numberOfLines={2}
        >
          {evento.titulo}
        </Text>
      </View>
    </View>
  );
}

function UpcomingCard({ evento }: { evento: EventoOut }) {
  const { colors } = useTheme();

  const { day, month } = formatDayMonthShort(evento.fecha);
  const accentColor = TIPO_COLOR[evento.tipo];
  const emoji = TIPO_EMOJI[evento.tipo];

  return (
    <View
      style={{
        width: 160,
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <View style={{ height: 3, backgroundColor: accentColor + "90" }} />

      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View
            style={{
              width: 38, height: 38,
              borderRadius: 10,
              backgroundColor: accentColor + "20",
              borderWidth: 1,
              borderColor: accentColor + "40",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </View>

          <View
            style={{
              backgroundColor: colors.cyan + "18",
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: colors.cyan,
                fontFamily: fontFamily.interBold,
                fontSize: 14,
                lineHeight: 16,
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
        </View>

        <Text
          style={{
            color: accentColor,
            fontFamily: fontFamily.interSemibold,
            fontSize: 10,
            letterSpacing: 1.5,
          }}
        >
          {TIPO_LABEL[evento.tipo]}
        </Text>

        <Text
          style={{
            color: colors.textPrimary,
            fontFamily: fontFamily.interSemibold,
            fontSize: 12,
            lineHeight: 16,
          }}
          numberOfLines={2}
        >
          {evento.titulo}
        </Text>
      </View>
    </View>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function LoadingBody() {
  const { colors } = useTheme();

  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, marginTop: spacing.lg }}>
      <SkeletonLoader height={320} radius={20} />
      <SkeletonLoader height={30} width="50%" radius={8} />
      <SkeletonLoader height={80} radius={14} />
      <SkeletonLoader height={80} radius={14} />
    </View>
  );
}

function ErrorBody({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.lg }}>
      <GlassCard variant="accent" contentStyle={{ padding: spacing.lg }}>
        <Text style={{ color: colors.error, fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Error
        </Text>
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.inter, fontSize: fontSize.body, marginTop: spacing.sm, marginBottom: spacing.lg }}>
          {message}
        </Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => ({
            alignSelf: "flex-start", backgroundColor: colors.cyan,
            borderRadius: radius.md, paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm, opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#0a0e17", fontFamily: fontFamily.interSemibold, fontSize: fontSize.caption }}>
            Reintentar
          </Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}
